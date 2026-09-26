// Recovery helpers keep AI text intact and route every structured candidate
// through ai-transfer's existing parser and apply boundary.
import { LIMITS } from './model.mjs';
import { applyTransfer, parseTransfer, TRANSFER_LIMITS } from './ai-transfer.mjs';

const own = (value, key) => Object.hasOwn(value, key);
const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
const isId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
const fencePrefix = /^[ \t]*\x60{3}/;
const fenceOpen = /^[ \t]*\x60{3}([A-Za-z0-9_-]*)[ \t]*$/;
const fenceClose = /^[ \t]*\x60{3}[ \t]*$/;
const markdownOutline = /^(?:#{1,6}[ \t]+\S|[ ]{0,3}(?:[-*+]|\d+[.)])[ \t]+\S|[・•][ \t]*\S|[ ]{0,3}(?:-\s*){3,}|[ ]{0,3}(?:\*\s*){3,}|[ ]{0,3}(?:_\s*){3,}|>[ \t]*\S)/m;

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function normalizeContext(options) {
  ensure(isRecord(options), '相談の種類を指定してください。');
  ensure(options.mode === 'branch' || options.mode === 'notebook', '相談の種類を選び直してください。');
  const context = { mode: options.mode };
  if (options.mode === 'branch') {
    ensure(isId(options.notebookId) && isId(options.parentId), '枝の取り込み先IDが必要です。');
    context.notebookId = options.notebookId;
    context.parentId = options.parentId;
  } else if (options.notebookId !== undefined || options.parentId !== undefined) {
    ensure(isId(options.notebookId) && isId(options.parentId), '取り込み元の対象IDが不正です。');
    context.notebookId = options.notebookId;
    context.parentId = options.parentId;
  }
  return context;
}

function parserOptions(context, mode) {
  if (mode === 'branch') {
    ensure(isId(context.notebookId) && isId(context.parentId),
      '現在の相談先がないため、この枝の返答は取り込めません。');
    return { mode, notebookId: context.notebookId, parentId: context.parentId };
  }
  return { mode };
}

function alternateMode(context) {
  if (context.mode === 'branch') return 'notebook';
  if (isId(context.notebookId) && isId(context.parentId)) return 'branch';
  return null;
}

function readLines(raw) {
  const lines = [];
  let start = 0;
  while (start < raw.length) {
    const newline = raw.indexOf('\n', start);
    const end = newline < 0 ? raw.length : newline + 1;
    let contentEnd = newline < 0 ? raw.length : newline;
    if (contentEnd > start && raw[contentEnd - 1] === '\r') contentEnd -= 1;
    let content = raw.slice(start, contentEnd);
    if (start === 0) content = content.replace(/^\uFEFF/, '');
    lines.push({ start, end, contentEnd, content });
    start = end;
  }
  return lines;
}

function scanFences(raw) {
  const lines = readLines(raw);
  const regions = [];
  const blocks = [];
  let open = null;
  let blockIndex = 0;
  let recognized = false;

  for (const line of lines) {
    if (!fencePrefix.test(line.content)) continue;
    recognized = true;
    const opening = line.content.match(fenceOpen);
    if (!open) {
      if (opening) {
        open = { line, language: opening[1].toLowerCase(), sourceIndex: blockIndex++ };
      } else {
        regions.push({
          kind: 'invalid',
          start: line.start,
          end: line.end,
          raw: raw.slice(line.start, line.end),
          reason: 'コードブロックの開始行を読み取れませんでした。',
          sourceIndex: blockIndex++,
        });
      }
      continue;
    }

    if (fenceClose.test(line.content)) {
      const block = {
        kind: 'block',
        start: open.line.start,
        end: line.contentEnd,
        raw: raw.slice(open.line.start, line.contentEnd),
        language: open.language,
        sourceIndex: open.sourceIndex,
      };
      blocks.push(block);
      regions.push(block);
      open = null;
      continue;
    }

    if (opening) {
      regions.push({
        kind: 'invalid',
        start: open.line.start,
        end: line.start,
        raw: raw.slice(open.line.start, line.start),
        reason: 'コードブロックが閉じられていません。',
        sourceIndex: open.sourceIndex,
      });
      open = { line, language: opening[1].toLowerCase(), sourceIndex: blockIndex++ };
      continue;
    }

    regions.push({
      kind: 'invalid',
      start: open.line.start,
      end: line.contentEnd,
      raw: raw.slice(open.line.start, line.contentEnd),
      reason: 'コードブロックの形式を確認してください。',
      sourceIndex: open.sourceIndex,
    });
    open = null;
  }

  if (open) {
    regions.push({
      kind: 'invalid',
      start: open.line.start,
      end: raw.length,
      raw: raw.slice(open.line.start),
      reason: 'コードブロックが閉じられていません。',
      sourceIndex: open.sourceIndex,
    });
  }

  regions.sort((left, right) => left.start - right.start);
  return { recognized, blocks, regions };
}

function addUnimported(items, id, raw, reason, candidateId) {
  if (!raw.length) return;
  items.push({ id, raw, reason, ...(candidateId ? { candidateId } : {}) });
}

function idFor(sourceIndex, context) {
  const notebookId = context.notebookId ?? '';
  const parentId = context.parentId ?? '';
  return [
    'candidate',
    sourceIndex,
    encodeURIComponent(context.mode),
    encodeURIComponent(notebookId),
    encodeURIComponent(parentId),
  ].join('-');
}

function memoPayload(text, mode, context) {
  if (mode === 'branch') {
    return {
      version: 2,
      kind: 'branches',
      notebookId: context.notebookId,
      parentId: context.parentId,
      branches: [{ text: 'AIからのメモ', note: text, children: [] }],
    };
  }
  return {
    version: 2,
    kind: 'notebook',
    title: 'AIからのメモ',
    note: '',
    children: [{ text: '受け取った内容', note: text, children: [] }],
  };
}

function candidateFromTransfer(source, sourceIndex, context, mode, modeMismatch, transfer) {
  return {
    id: idFor(sourceIndex, context),
    kind: 'transfer',
    mode,
    format: transfer.format,
    label: modeMismatch ? '別の相談方法の返答' : transfer.format === 'json' ? 'JSONの返答' : 'Markdownの返答',
    raw: source.raw,
    ready: true,
    modeMismatch,
    preview: transfer,
  };
}

function isPlainProse(source, language) {
  const body = source.memoText ?? source.raw;
  const clean = body.replace(/^\uFEFF/, '').trim();
  if (!clean || /^[{[]/.test(clean) || markdownOutline.test(clean)) return false;
  if (source.fenced && !['', 'md', 'markdown'].includes(language)) return false;
  return true;
}

function memoCandidate(source, sourceIndex, context) {
  const text = source.memoText ?? source.raw;
  const candidate = {
    id: idFor(sourceIndex, context),
    kind: 'memo',
    mode: context.mode,
    format: 'memo',
    label: '1枚のメモとして取り込む',
    raw: source.raw,
    ready: text.length <= LIMITS.note,
    modeMismatch: false,
    preview: null,
  };
  if (!candidate.ready) {
    candidate.reason = '原文がノートのメモ上限である' + LIMITS.note + '文字を超えています。原文は短縮せず、このままでは取り込めません。';
    return candidate;
  }
  candidate.preview = parseTransfer(JSON.stringify(memoPayload(text, context.mode, context)),
    parserOptions(context, context.mode));
  return candidate;
}

function classifySource(source, sourceIndex, context) {
  const expectedOptions = parserOptions(context, context.mode);
  try {
    const transfer = parseTransfer(source.raw, expectedOptions);
    return {
      candidate: candidateFromTransfer(source, sourceIndex, context, transfer.mode, false, transfer),
      error: null,
    };
  } catch (expectedError) {
    const otherMode = alternateMode(context);
    if (otherMode) {
      try {
        const transfer = parseTransfer(source.raw, parserOptions(context, otherMode));
        return {
          candidate: candidateFromTransfer(source, sourceIndex, context, transfer.mode, true, transfer),
          error: null,
        };
      } catch {
        // Invalid or misdirected alternate-mode data remains raw text below.
      }
    }

    const language = source.language ?? '';
    const appearsJson = language === 'json' || /^[\s\uFEFF]*[\[{]/.test(source.memoText ?? source.raw);
    if (!appearsJson && isPlainProse(source, language)) {
      try {
        return { candidate: memoCandidate(source, sourceIndex, context), error: null };
      } catch (error) {
        return { candidate: null, error: error.message || 'メモ候補を確認できませんでした。' };
      }
    }
    return {
      candidate: null,
      error: expectedError.message || '構造化された返答として確認できませんでした。',
    };
  }
}

export function inspectAiRecovery(raw, rawOptions) {
  ensure(typeof raw === 'string', 'AIの返答を文字列で指定してください。');
  const context = normalizeContext(rawOptions);
  const result = { raw, candidates: [], unimported: [] };
  if (raw.length > TRANSFER_LIMITS.input) {
    addUnimported(result.unimported, 'unimported-input', raw,
      '返答が' + TRANSFER_LIMITS.input + '文字を超えています。原文は保持しましたが、この長さでは読み取れません。');
    return freezeDeep(result);
  }
  if (!raw.trim()) return freezeDeep(result);

  const scan = scanFences(raw);
  if (scan.recognized) {
    let cursor = 0;
    for (const region of scan.regions) {
      if (region.start > cursor) {
        const outside = raw.slice(cursor, region.start);
        if (outside.trim())
          addUnimported(result.unimported, 'unimported-outside-' + cursor, outside,
            'コードブロックの外にある文章です。内容は保持しています。');
      }
      cursor = Math.max(cursor, region.end);
      if (region.kind === 'invalid') {
        addUnimported(result.unimported, 'unimported-block-' + region.sourceIndex,
          region.raw, region.reason);
        continue;
      }
      const source = { raw: region.raw, fenced: true, language: region.language };
      const classified = classifySource(source, region.sourceIndex, context);
      if (classified.candidate) result.candidates.push(classified.candidate);
      else
        addUnimported(result.unimported, 'unimported-block-' + region.sourceIndex,
          region.raw, classified.error);
    }
    if (cursor < raw.length) {
      const outside = raw.slice(cursor);
      if (outside.trim())
        addUnimported(result.unimported, 'unimported-outside-' + cursor, outside,
          'コードブロックの外にある文章です。内容は保持しています。');
    }
    return freezeDeep(result);
  }

  const classified = classifySource({ raw, fenced: false }, 0, context);
  if (classified.candidate) result.candidates.push(classified.candidate);
  else addUnimported(result.unimported, 'unimported-answer', raw, classified.error);
  return freezeDeep(result);
}

function findCandidate(recovery, id) {
  return recovery.candidates.find((candidate) => candidate.id === id);
}

function pendingCandidates(recovery, selectedId) {
  const items = recovery.unimported.map((item) => ({ ...item }));
  for (const candidate of recovery.candidates) {
    if (candidate.id === selectedId) continue;
    items.push({
      id: 'unimported-' + candidate.id,
      candidateId: candidate.id,
      raw: candidate.raw,
      reason: '別の候補です。選んで確認するまで未取り込みです。',
    });
  }
  return items;
}

export function previewAiRecoveryCandidate(raw, rawOptions, candidateId) {
  const recovery = inspectAiRecovery(raw, rawOptions);
  const candidate = findCandidate(recovery, candidateId);
  ensure(candidate, '選んだ候補が見つかりません。返答をもう一度確認してください。');
  ensure(candidate.ready, candidate.reason || 'この候補は取り込めません。原文は保持されています。');
  // inspectAiRecovery reparses this candidate from raw each time; persisted preview
  // objects never cross the validation boundary.
  return freezeDeep({
    raw: recovery.raw,
    candidate,
    preview: candidate.preview,
    unimported: pendingCandidates(recovery, candidate.id),
  });
}

export function applyAiRecoveryCandidate(workspace, raw, rawOptions, candidateId, rawApplyOptions) {
  ensure(isRecord(rawApplyOptions), '追加するカードを選んでから確定してください。');
  const keys = Reflect.ownKeys(rawApplyOptions);
  ensure(keys.every((key) => key === 'selectedIndexes'), '追加設定に未対応の項目があります。');
  ensure(Array.isArray(rawApplyOptions.selectedIndexes),
    '追加するカードを選んでから確定してください。');
  const reviewed = previewAiRecoveryCandidate(raw, rawOptions, candidateId);
  const applyOptions = { selectedIndexes: [...rawApplyOptions.selectedIndexes] };
  return applyTransfer(workspace, reviewed.preview, applyOptions);
}
