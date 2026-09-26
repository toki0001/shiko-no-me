// AI replies are saved separately from notebook contents. Every write checks
// the exact storage snapshot it was based on so another tab cannot silently win.
import { TRANSFER_LIMITS } from './ai-transfer.mjs';
import { LIMITS } from './model.mjs';

export const AI_DRAFT_STORAGE_KEY = 'think-tree-ai-drafts.v1';
export const AI_DRAFT_LIMITS = Object.freeze({
  entries: 16,
  characters: 200_000,
  serializedCharacters: 1_000_000,
});

const RECORD_KEYS = ['mode', 'bookId', 'parentId', 'answer', 'question', 'scope', 'intent', 'updatedAt', 'recoveryProgress'];
const USER_KEYS = ['mode', 'bookId', 'parentId', 'answer', 'question', 'scope', 'intent'];
const own = (value, key) => Object.hasOwn(value, key);
let revisionCounter = 0;

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

function isRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value, allowed, required, label) {
  ensure(isRecord(value), label + 'の形式が違います。');
  const keys = Reflect.ownKeys(value);
  ensure(keys.every((key) => typeof key === 'string' && allowed.includes(key)),
    label + 'に未対応の項目があります。');
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    ensure(descriptor && 'value' in descriptor, label + 'に読み取れない項目があります。');
  }
  for (const key of required) ensure(own(value, key), label + 'に' + key + 'がありません。');
}

function isId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
}

export function aiDraftSessionKey({ mode, bookId, parentId }) {
  return JSON.stringify([mode, bookId, mode === 'branch' ? parentId : null]);
}

function normalizeIdentity(value) {
  exactKeys(value, ['mode', 'bookId', 'parentId'], ['mode', 'bookId', 'parentId'], '下書きの相談先');
  ensure(value.mode === 'branch' || value.mode === 'notebook', '相談の種類を選び直してください。');
  ensure(isId(value.bookId), 'ノートIDが不正です。');
  if (value.mode === 'branch') ensure(isId(value.parentId), '相談するカードIDが不正です。');
  else ensure(value.parentId === null, 'ノート作成の下書きに相談先カードは指定できません。');
  return { mode: value.mode, bookId: value.bookId, parentId: value.mode === 'branch' ? value.parentId : null };
}

function normalizeRecoveryProgress(value, identity, answer) {
  exactKeys(value, ['raw', 'options', 'receipts'], ['raw', 'options', 'receipts'], '返答の確認状況');
  ensure(typeof answer === 'string' && answer.length > 0 && value.raw === answer,
    '返答の確認状況が現在の返答と一致しません。');
  const options = value.options;
  exactKeys(options, ['mode', 'notebookId', 'parentId'], ['mode'], '返答の相談先');
  ensure(options.mode === 'branch' || options.mode === 'notebook', '返答の相談方法が不正です。');
  if (options.mode === 'branch') {
    ensure(identity.mode === 'branch' && isId(options.notebookId) && isId(options.parentId) &&
      options.notebookId === identity.bookId && options.parentId === identity.parentId,
    '返答の確認先が元のカードと違います。');
  } else if (identity.mode === 'notebook') {
    ensure(options.notebookId === undefined && options.parentId === undefined,
      '新しいノートの返答確認先が不正です。');
  } else {
    ensure(isId(options.notebookId) && isId(options.parentId) &&
      options.notebookId === identity.bookId && options.parentId === identity.parentId,
    '返答の確認先が元のカードと違います。');
  }

  ensure(Array.isArray(value.receipts) && value.receipts.length <= answer.length,
    '返答の確認状況の候補数が不正です。');
  const receiptKeys = new Set();
  let importedCount = 0;
  const receipts = value.receipts.map((receipt) => {
    exactKeys(receipt, ['candidateId', 'index', 'notebookId', 'addedIds'],
      ['candidateId', 'index', 'notebookId', 'addedIds'], '追加済み部分の記録');
    const { candidateId, index, notebookId, addedIds } = receipt;
    ensure(typeof candidateId === 'string' && candidateId.length > 0 && candidateId.length <= 512,
      '返答の確認状況の候補IDが不正です。');
    ensure(Number.isSafeInteger(index) && index >= 0 && index < LIMITS.nodes,
      '返答の確認状況のカード番号が不正です。');
    ensure(isId(notebookId), '追加済みノートのIDが不正です。');
    const key = JSON.stringify([candidateId, index]);
    ensure(!receiptKeys.has(key), '返答の確認状況に同じ部分が複数あります。');
    receiptKeys.add(key);
    ensure(Array.isArray(addedIds) && addedIds.length > 0 && addedIds.length <= LIMITS.nodes,
      '追加済みカードの数が不正です。');
    const seenIds = new Set();
    const normalizedIds = addedIds.map((id) => {
      ensure(isId(id), '追加済みカードのIDが不正です。');
      ensure(!seenIds.has(id), '追加済みカードのIDが重複しています。');
      seenIds.add(id);
      importedCount += 1;
      return id;
    });
    return { candidateId, index, notebookId, addedIds: normalizedIds };
  }).sort((left, right) => left.candidateId.localeCompare(right.candidateId) || left.index - right.index);
  ensure(importedCount <= answer.length * 2, '返答の確認状況のカード数が不正です。');
  return {
    raw: value.raw,
    options: options.mode === 'branch'
      ? { mode: 'branch', notebookId: options.notebookId, parentId: options.parentId }
      : options.notebookId === undefined
        ? { mode: 'notebook' }
        : { mode: 'notebook', notebookId: options.notebookId, parentId: options.parentId },
    receipts,
  };
}

function normalizeDraft(value, { fromStorage = false } = {}) {
  exactKeys(value, RECORD_KEYS, fromStorage ? [...USER_KEYS, 'updatedAt'] : USER_KEYS, 'AIの下書き');
  const identity = normalizeIdentity({
    mode: value.mode,
    bookId: value.bookId,
    parentId: value.parentId,
  });
  ensure(typeof value.answer === 'string' && value.answer.length <= TRANSFER_LIMITS.input,
    'AIの返答は' + TRANSFER_LIMITS.input + '文字以内にしてください。');
  ensure(typeof value.question === 'string' && value.question.length <= TRANSFER_LIMITS.question,
    '質問は' + TRANSFER_LIMITS.question + '文字以内にしてください。');
  ensure(typeof value.intent === 'string' && value.intent.length <= TRANSFER_LIMITS.intent,
    '整理したいことは' + TRANSFER_LIMITS.intent + '文字以内にしてください。');
  ensure(value.scope === 'branch' || value.scope === 'notebook', '相談範囲を選び直してください。');
  if (identity.mode === 'notebook') ensure(value.scope === 'notebook', 'ノート作成の相談範囲が不正です。');
  let updatedAt = value.updatedAt;
  if (fromStorage) {
    ensure(typeof updatedAt === 'string' && updatedAt.length <= 40 && Number.isFinite(Date.parse(updatedAt)),
      '下書きの保存日時が不正です。');
  } else {
    updatedAt = new Date().toISOString();
  }
  const normalized = {
    ...identity,
    answer: value.answer,
    question: value.question,
    scope: value.scope,
    intent: value.intent,
    updatedAt,
  };
  if (value.recoveryProgress !== undefined)
    normalized.recoveryProgress = normalizeRecoveryProgress(value.recoveryProgress, identity, value.answer);
  return normalized;
}

function textCharacters(drafts) {
  return drafts.reduce((total, draft) => total + draft.answer.length + draft.question.length + draft.intent.length, 0);
}

function validateDraftList(drafts) {
  ensure(Array.isArray(drafts), '下書きの一覧が配列ではありません。');
  ensure(drafts.length <= AI_DRAFT_LIMITS.entries, '下書きの件数上限を超えています。');
  const normalized = drafts.map((draft) => normalizeDraft(draft, { fromStorage: true }));
  const keys = new Set();
  for (const draft of normalized) {
    const key = aiDraftSessionKey(draft);
    ensure(!keys.has(key), '同じ相談先の下書きが複数あります。');
    keys.add(key);
  }
  ensure(textCharacters(normalized) <= AI_DRAFT_LIMITS.characters, '下書きの合計文字数上限を超えています。');
  return normalized;
}

function decode(raw) {
  const envelope = JSON.parse(raw);
  exactKeys(envelope, ['version', 'revision', 'drafts'], ['version', 'revision', 'drafts'], '下書きの保存データ');
  ensure(envelope.version === 1, '対応していない下書きの保存形式です。');
  ensure(typeof envelope.revision === 'string' && envelope.revision.length > 0 && envelope.revision.length <= 100,
    '下書きの保存世代が不正です。');
  return {
    revision: envelope.revision,
    drafts: validateDraftList(envelope.drafts),
  };
}

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    throw new Error('このブラウザの下書き保存領域を利用できません。');
  }
}

function emptySuccess() {
  return { ok: true, drafts: [], raw: null };
}

function failure(code, error) {
  return { ok: false, code, error };
}

function storageError(error) {
  return error?.message || '下書きを読み書きできませんでした。保存内容は変更していません。';
}

function decodeCurrent(raw) {
  if (raw === null) return { revision: '', drafts: [] };
  return decode(raw);
}

function nextRevision() {
  revisionCounter += 1;
  try {
    if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  } catch {
    // A unique non-secret comparison token is enough when crypto is unavailable.
  }
  return Date.now().toString(36) + '-' + revisionCounter.toString(36) + '-' + Math.random().toString(36).slice(2);
}

function availableLocks(rawLocks) {
  if (rawLocks !== undefined) return rawLocks;
  try {
    return globalThis.navigator?.locks ?? null;
  } catch {
    return null;
  }
}

async function withStorageLock(operation, locks) {
  if (locks && typeof locks.request === 'function')
    return locks.request(AI_DRAFT_STORAGE_KEY, { mode: 'exclusive' }, operation);
  return operation();
}

function validExpectedRaw(expectedRaw) {
  return expectedRaw === null || typeof expectedRaw === 'string';
}

export async function loadAIDrafts({ storage, readOnly = false } = {}) {
  if (readOnly) return { ok: true, drafts: [], raw: null, readOnly: true };
  let current;
  try {
    current = resolveStorage(storage).getItem(AI_DRAFT_STORAGE_KEY);
  } catch {
    return failure('unavailable',
      'このブラウザではAIの下書きを読み込めません。入力した内容は画面に残してください。');
  }
  if (current === null) return emptySuccess();
  try {
    const decoded = decode(current);
    return { ok: true, drafts: decoded.drafts, raw: current };
  } catch {
    return failure('corrupt', 'AIの下書きを読み込めませんでした。保存内容は変更していません。');
  }
}

async function updateDrafts({ operation, identity, record, storage, expectedRaw, readOnly, locks }) {
  if (readOnly) return failure('readonly', '閲覧専用ノートではAIの下書きを保存・削除できません。');
  if (!validExpectedRaw(expectedRaw))
    return failure('missing-snapshot', '下書きの保存状態がありません。読み込み直してから操作してください。');

  let normalizedIdentity;
  let normalizedRecord;
  try {
    normalizedIdentity = normalizeIdentity({
      mode: identity?.mode,
      bookId: identity?.bookId,
      parentId: identity?.parentId,
    });
    if (operation === 'save') normalizedRecord = normalizeDraft(record);
  } catch (error) {
    return failure('invalid', storageError(error));
  }

  try {
    const store = resolveStorage(storage);
    return await withStorageLock(() => {
      let current;
      try {
        current = store.getItem(AI_DRAFT_STORAGE_KEY);
      } catch {
        return failure('unavailable', 'このブラウザではAIの下書きを保存できません。入力した内容は画面に残っています。');
      }
      if (current !== expectedRaw)
        return failure('conflict', '別のタブでAIの下書きが更新されました。画面の入力は残しています。下書きを読み直してください。');

      let decoded;
      try {
        decoded = decodeCurrent(current);
      } catch {
        return failure('corrupt', '保存済みのAI下書きを読み取れません。元の内容は変更していません。');
      }

      const targetKey = aiDraftSessionKey(normalizedIdentity);
      const existingIndex = decoded.drafts.findIndex((draft) => aiDraftSessionKey(draft) === targetKey);
      let drafts;
      if (operation === 'remove') {
        if (existingIndex < 0) return { ok: true, drafts: decoded.drafts, raw: current };
        drafts = decoded.drafts.filter((_, index) => index !== existingIndex);
      } else {
        if (existingIndex < 0 && decoded.drafts.length >= AI_DRAFT_LIMITS.entries)
          return failure('limit', '下書きは' + AI_DRAFT_LIMITS.entries + '件まで保存できます。未取り込みの下書きを削除してから保存してください。');
        const updatedRecord = { ...normalizedRecord, updatedAt: new Date().toISOString() };
        drafts = [
          updatedRecord,
          ...decoded.drafts.filter((_, index) => index !== existingIndex),
        ];
      }

      if (textCharacters(drafts) > AI_DRAFT_LIMITS.characters)
        return failure('limit', '下書きの合計が' + AI_DRAFT_LIMITS.characters + '文字を超えます。未取り込み内容は削除していません。');

      const nextRaw = JSON.stringify({ version: 1, revision: nextRevision(), drafts });
      if (nextRaw.length > AI_DRAFT_LIMITS.serializedCharacters)
        return failure('limit', '下書きの保存データが大きすぎます。未取り込み内容は削除していません。');
      try {
        store.setItem(AI_DRAFT_STORAGE_KEY, nextRaw);
        const savedRaw = store.getItem(AI_DRAFT_STORAGE_KEY);
        if (savedRaw !== nextRaw)
          return failure('conflict', '別のタブが下書きを同時に更新しました。入力した内容は画面に残しています。');
      } catch {
        return failure('write-failed', 'AIの下書きを保存できませんでした。入力した内容は画面に残しています。');
      }
      return { ok: true, drafts, raw: nextRaw };
    }, availableLocks(locks));
  } catch (error) {
    return failure('unavailable', storageError(error));
  }
}

export async function saveAIDraft(record, options = {}) {
  return updateDrafts({
    operation: 'save',
    identity: record,
    record,
    storage: options.storage,
    expectedRaw: options.expectedRaw,
    readOnly: options.readOnly === true,
    locks: options.locks,
  });
}

export async function removeAIDraft(identity, options = {}) {
  return updateDrafts({
    operation: 'remove',
    identity,
    storage: options.storage,
    expectedRaw: options.expectedRaw,
    readOnly: options.readOnly === true,
    locks: options.locks,
  });
}
