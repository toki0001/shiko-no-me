import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotebook } from '../dist/model.mjs';
import { KEY as NOTEBOOK_KEY } from '../dist/storage.mjs';
import {
  AI_DRAFT_LIMITS,
  AI_DRAFT_STORAGE_KEY,
  aiDraftSessionKey,
  loadAIDrafts,
  removeAIDraft,
  saveAIDraft,
} from '../dist/ai-drafts.mjs';

function memoryStorage(initial = new Map()) {
  return {
    values: initial,
    getItem(key) {
      return this.values.has(key) ? this.values.get(key) : null;
    },
    setItem(key, value) {
      this.values.set(key, value);
    },
  };
}

function branchDraft(parentId, overrides = {}) {
  return {
    mode: 'branch',
    bookId: 'book-one',
    parentId,
    answer: 'Unimported answer text.',
    question: 'What should I consider?',
    scope: 'branch',
    intent: '見落としを探す',
    ...overrides,
  };
}

function notebookDraft(overrides = {}) {
  return {
    mode: 'notebook',
    bookId: 'book-one',
    parentId: null,
    answer: 'A conversation summary that is not imported yet.',
    question: 'Organize this conversation.',
    scope: 'notebook',
    intent: '会話から新しいノートを作る',
    ...overrides,
  };
}

async function persistOne(storage, record, priorRaw = null) {
  return saveAIDraft(record, { storage, expectedRaw: priorRaw, locks: null });
}

test('draft text safely round-trips by mode, notebook, and parent without storing a preview', async () => {
  const storage = memoryStorage();
  const notebookRaw = JSON.stringify({
    revision: 'notebook-revision',
    workspace: { version: 1, activeId: 'book-one', notebooks: [createNotebook('Root')] },
  });
  storage.values.set(NOTEBOOK_KEY, notebookRaw);
  const answer = 'Exact answer.\r\nWith newlines, <tags>, and raw JSON: {"kind":"untrusted"}.';
  const record = branchDraft('parent-one', { answer });

  const empty = await loadAIDrafts({ storage });
  assert.deepEqual(empty, { ok: true, drafts: [], raw: null });
  const saved = await persistOne(storage, record, empty.raw);
  assert.equal(saved.ok, true);
  assert.equal(saved.drafts.length, 1);
  assert.equal(saved.drafts[0].answer, answer);
  assert.equal(Object.hasOwn(saved.drafts[0], 'preview'), false);
  assert.equal(Object.hasOwn(saved.drafts[0], 'transfer'), false);
  assert.equal(storage.values.get(NOTEBOOK_KEY), notebookRaw);

  const restored = await loadAIDrafts({ storage });
  assert.equal(restored.ok, true);
  assert.equal(restored.drafts.length, 1);
  assert.deepEqual(
    {
      mode: restored.drafts[0].mode,
      bookId: restored.drafts[0].bookId,
      parentId: restored.drafts[0].parentId,
      answer: restored.drafts[0].answer,
      question: restored.drafts[0].question,
      scope: restored.drafts[0].scope,
      intent: restored.drafts[0].intent,
    },
    record,
  );
  assert.equal(aiDraftSessionKey(restored.drafts[0]), '["branch","book-one","parent-one"]');
});

test('validated recovery progress round-trips with its raw answer and older drafts without progress still load', async () => {
  const storage = memoryStorage();
  const empty = await loadAIDrafts({ storage });
  const record = branchDraft('parent-one', {
    answer: '```json\n{"version":2}\n```',
    recoveryProgress: {
      raw: '```json\n{"version":2}\n```',
      options: { mode: 'branch', notebookId: 'book-one', parentId: 'parent-one' },
      receipts: [
        { candidateId: 'candidate-0-branch-book-one-parent-one', index: 1, notebookId: 'book-one', addedIds: ['imported-two'] },
        { candidateId: 'candidate-0-branch-book-one-parent-one', index: 0, notebookId: 'book-one', addedIds: ['imported-one'] },
      ],
    },
  });
  const saved = await saveAIDraft(record, { storage, expectedRaw: empty.raw, locks: null });
  assert.equal(saved.ok, true);
  assert.deepEqual(saved.drafts[0].recoveryProgress, {
    raw: record.answer,
    options: { mode: 'branch', notebookId: 'book-one', parentId: 'parent-one' },
    receipts: [
      { candidateId: 'candidate-0-branch-book-one-parent-one', index: 0, notebookId: 'book-one', addedIds: ['imported-one'] },
      { candidateId: 'candidate-0-branch-book-one-parent-one', index: 1, notebookId: 'book-one', addedIds: ['imported-two'] },
    ],
  });
  assert.equal(Object.hasOwn(saved.drafts[0], 'preview'), false);
  assert.equal(Object.hasOwn(saved.drafts[0], 'transfer'), false);

  const legacyEnvelope = JSON.parse(saved.raw);
  delete legacyEnvelope.drafts[0].recoveryProgress;
  legacyEnvelope.revision = 'legacy-without-recovery-progress';
  storage.values.set(AI_DRAFT_STORAGE_KEY, JSON.stringify(legacyEnvelope));
  const legacy = await loadAIDrafts({ storage });
  assert.equal(legacy.ok, true);
  assert.equal(legacy.drafts[0].answer, record.answer);
  assert.equal(Object.hasOwn(legacy.drafts[0], 'recoveryProgress'), false);
});

test('invalid recovery progress is rejected without replacing stored content', async () => {
  const storage = memoryStorage();
  const empty = await loadAIDrafts({ storage });
  const wrongRaw = await saveAIDraft(branchDraft('parent-one', {
    recoveryProgress: {
      raw: 'different raw answer',
      options: { mode: 'branch', notebookId: 'book-one', parentId: 'parent-one' },
      receipts: [{
        candidateId: 'candidate-0-branch-book-one-parent-one', index: 0,
        notebookId: 'book-one', addedIds: ['imported-one'],
      }],
    },
  }), { storage, expectedRaw: empty.raw, locks: null });
  assert.equal(wrongRaw.ok, false);
  assert.equal(wrongRaw.code, 'invalid');
  assert.equal(storage.getItem(AI_DRAFT_STORAGE_KEY), null);
  const invalid = await saveAIDraft(branchDraft('parent-one', {
    recoveryProgress: {
      raw: 'Unimported answer text.',
      options: { mode: 'branch', notebookId: 'book-one', parentId: 'different-parent' },
      receipts: [{
        candidateId: 'candidate-0-branch-book-one-parent-one', index: 0,
        notebookId: 'book-one', addedIds: ['imported-one'],
      }],
    },
  }), { storage, expectedRaw: empty.raw, locks: null });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.code, 'invalid');
  assert.equal(storage.getItem(AI_DRAFT_STORAGE_KEY), null);

  const malformedEnvelope = {
    version: 1,
    revision: 'bad-progress',
    drafts: [{
      ...branchDraft('parent-one'),
      updatedAt: new Date(0).toISOString(),
      recoveryProgress: {
        raw: 'Unimported answer text.',
        options: { mode: 'branch', notebookId: 'book-one', parentId: 'parent-one' },
        receipts: [{
          candidateId: 'candidate-0-branch-book-one-parent-one', index: -1,
          notebookId: 'book-one', addedIds: ['imported-one'],
        }],
      },
    }],
  };
  const raw = JSON.stringify(malformedEnvelope);
  storage.values.set(AI_DRAFT_STORAGE_KEY, raw);
  const restored = await loadAIDrafts({ storage });
  assert.equal(restored.ok, false);
  assert.equal(restored.code, 'corrupt');
  assert.equal(storage.values.get(AI_DRAFT_STORAGE_KEY), raw);
});

test('sessions remain separate and an individual delete removes only the exact mode/book/parent', async () => {
  const storage = memoryStorage();
  let state = await loadAIDrafts({ storage });
  for (const record of [
    branchDraft('parent-one'),
    branchDraft('parent-two', { answer: 'Second answer.' }),
    notebookDraft(),
  ]) {
    state = await saveAIDraft(record, { storage, expectedRaw: state.raw, locks: null });
    assert.equal(state.ok, true);
  }
  assert.deepEqual(state.drafts.map(aiDraftSessionKey), [
    '["notebook","book-one",null]',
    '["branch","book-one","parent-two"]',
    '["branch","book-one","parent-one"]',
  ]);

  const removed = await removeAIDraft(
    { mode: 'branch', bookId: 'book-one', parentId: 'parent-one' },
    { storage, expectedRaw: state.raw, locks: null },
  );
  assert.equal(removed.ok, true);
  assert.deepEqual(removed.drafts.map(aiDraftSessionKey), [
    '["notebook","book-one",null]',
    '["branch","book-one","parent-two"]',
  ]);
  const restored = await loadAIDrafts({ storage });
  assert.equal(restored.drafts.some((draft) => draft.parentId === 'parent-one'), false);
  assert.equal(restored.drafts.some((draft) => draft.parentId === 'parent-two'), true);
});

test('a stale tab cannot overwrite a newer unimported draft', async () => {
  const storage = memoryStorage();
  const firstTab = await loadAIDrafts({ storage });
  const secondTab = await loadAIDrafts({ storage });
  const first = await persistOne(storage, branchDraft('parent-one'), firstTab.raw);
  assert.equal(first.ok, true);

  const stale = await persistOne(
    storage,
    branchDraft('parent-two', { answer: 'Must remain in the second tab.' }),
    secondTab.raw,
  );
  assert.equal(stale.ok, false);
  assert.equal(stale.code, 'conflict');
  assert.match(stale.error, /別のタブ/);
  assert.equal(storage.values.get(AI_DRAFT_STORAGE_KEY), first.raw);
  const latest = await loadAIDrafts({ storage });
  assert.equal(latest.drafts.length, 1);
  assert.equal(latest.drafts[0].parentId, 'parent-one');
});

test('entry and total-text limits fail without silently evicting an unimported draft', async () => {
  const storage = memoryStorage();
  let state = await loadAIDrafts({ storage });
  for (let index = 0; index < AI_DRAFT_LIMITS.entries; index += 1) {
    state = await saveAIDraft(
      branchDraft('parent-' + index),
      { storage, expectedRaw: state.raw, locks: null },
    );
    assert.equal(state.ok, true);
  }
  const fullRaw = state.raw;
  const tooMany = await saveAIDraft(
    branchDraft('parent-extra'),
    { storage, expectedRaw: fullRaw, locks: null },
  );
  assert.equal(tooMany.ok, false);
  assert.equal(tooMany.code, 'limit');
  assert.equal(storage.values.get(AI_DRAFT_STORAGE_KEY), fullRaw);
  assert.equal((await loadAIDrafts({ storage })).drafts.length, AI_DRAFT_LIMITS.entries);

  const totalStorage = memoryStorage();
  let totalState = await loadAIDrafts({ storage: totalStorage });
  for (let index = 0; index < 3; index += 1) {
    totalState = await saveAIDraft(
      branchDraft('large-' + index, { answer: 'a'.repeat(60_000) }),
      { storage: totalStorage, expectedRaw: totalState.raw, locks: null },
    );
    assert.equal(totalState.ok, true);
  }
  const totalBefore = totalState.raw;
  const tooLarge = await saveAIDraft(
    branchDraft('large-3', { answer: 'b'.repeat(21_000) }),
    { storage: totalStorage, expectedRaw: totalBefore, locks: null },
  );
  assert.equal(tooLarge.ok, false);
  assert.equal(tooLarge.code, 'limit');
  assert.equal(totalStorage.values.get(AI_DRAFT_STORAGE_KEY), totalBefore);
  assert.equal((await loadAIDrafts({ storage: totalStorage })).drafts.length, 3);
});

test('storage write failure is atomic and leaves the notebook and prior draft untouched', async () => {
  const storage = memoryStorage();
  const notebook = { version: 1, activeId: 'book-one', notebooks: [createNotebook('Unchanged notebook')] };
  const notebookRaw = JSON.stringify({ revision: 'stable', workspace: notebook });
  storage.values.set(NOTEBOOK_KEY, notebookRaw);
  const empty = await loadAIDrafts({ storage });
  const saved = await persistOne(storage, branchDraft('parent-one'), empty.raw);
  assert.equal(saved.ok, true);
  const oldDraftRaw = saved.raw;
  const oldDrafts = saved.drafts;

  storage.setItem = function (key, value) {
    if (key === AI_DRAFT_STORAGE_KEY) throw new Error('quota');
    this.values.set(key, value);
  };
  const failed = await saveAIDraft(
    branchDraft('parent-one', { answer: 'Updated in the text field but not persisted.' }),
    { storage, expectedRaw: oldDraftRaw, locks: null },
  );
  assert.equal(failed.ok, false);
  assert.equal(failed.code, 'write-failed');
  assert.equal(storage.values.get(AI_DRAFT_STORAGE_KEY), oldDraftRaw);
  assert.equal(storage.values.get(NOTEBOOK_KEY), notebookRaw);
  assert.deepEqual(oldDrafts[0].answer, 'Unimported answer text.');
});

test('corrupt or preview-bearing storage is never overwritten, and read-only demos never touch storage', async () => {
  const storage = memoryStorage();
  storage.values.set(AI_DRAFT_STORAGE_KEY, '{broken');
  const badRaw = storage.values.get(AI_DRAFT_STORAGE_KEY);
  const corrupt = await loadAIDrafts({ storage });
  assert.equal(corrupt.ok, false);
  assert.equal(corrupt.code, 'corrupt');
  const saveOverCorrupt = await saveAIDraft(
    branchDraft('parent-one'),
    { storage, expectedRaw: badRaw, locks: null },
  );
  assert.equal(saveOverCorrupt.ok, false);
  assert.equal(saveOverCorrupt.code, 'corrupt');
  assert.equal(storage.values.get(AI_DRAFT_STORAGE_KEY), badRaw);

  const previewBearing = {
    version: 1,
    revision: 'unsafe',
    drafts: [{
      ...branchDraft('parent-one'),
      updatedAt: new Date(0).toISOString(),
      preview: { mode: 'branch', branches: [{ text: 'Do not apply me' }] },
    }],
  };
  const unsafeRaw = JSON.stringify(previewBearing);
  storage.values.set(AI_DRAFT_STORAGE_KEY, unsafeRaw);
  const unsafe = await loadAIDrafts({ storage });
  assert.equal(unsafe.ok, false);
  assert.equal(unsafe.code, 'corrupt');
  assert.equal(storage.values.get(AI_DRAFT_STORAGE_KEY), unsafeRaw);

  let accesses = 0;
  const forbiddenStorage = {
    getItem() {
      accesses += 1;
      throw new Error('must not be read');
    },
    setItem() {
      accesses += 1;
      throw new Error('must not be written');
    },
  };
  const readOnly = await loadAIDrafts({ storage: forbiddenStorage, readOnly: true });
  assert.equal(readOnly.ok, true);
  assert.deepEqual(readOnly.drafts, []);
  assert.equal((await saveAIDraft(branchDraft('parent-one'), {
    storage: forbiddenStorage, expectedRaw: null, readOnly: true,
  })).code, 'readonly');
  assert.equal((await removeAIDraft(
    { mode: 'branch', bookId: 'book-one', parentId: 'parent-one' },
    { storage: forbiddenStorage, expectedRaw: null, readOnly: true },
  )).code, 'readonly');
  assert.equal(accesses, 0);
});

test('storage access denial returns a visible failure without changing notebook data', async () => {
  const storage = memoryStorage();
  const notebookRaw = JSON.stringify({ version: 1, activeId: 'book-one', notebooks: [createNotebook('Safe')] });
  storage.values.set(NOTEBOOK_KEY, notebookRaw);
  const blockedStorage = {
    getItem() {
      throw new Error('denied');
    },
    setItem() {
      throw new Error('denied');
    },
  };
  const loaded = await loadAIDrafts({ storage: blockedStorage });
  assert.equal(loaded.ok, false);
  assert.equal(loaded.code, 'unavailable');
  assert.match(loaded.error, /下書き/);
  const saved = await saveAIDraft(branchDraft('parent-one'), {
    storage: blockedStorage, expectedRaw: null, locks: null,
  });
  assert.equal(saved.ok, false);
  assert.equal(saved.code, 'unavailable');
  assert.equal(storage.values.get(NOTEBOOK_KEY), notebookRaw);
});
