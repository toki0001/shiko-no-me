import test from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, addNode, clone, createNotebook, getNode } from '../dist/model.mjs';
import { initializeBoard } from '../dist/board-model.mjs';
import {
  applyAiRecoveryCandidate,
  inspectAiRecovery,
  previewAiRecoveryCandidate,
} from '../dist/ai-recovery.mjs';
import { TRANSFER_LIMITS } from '../dist/ai-transfer.mjs';

const workspaceFor = (book) => ({ version: 1, activeId: book.id, notebooks: [book] });
const branchPayload = (book, parentId, branches) => JSON.stringify({
  version: 2,
  kind: 'branches',
  notebookId: book.id,
  parentId,
  branches,
});
const branchContext = (book, parentId = book.rootId) => ({
  mode: 'branch',
  notebookId: book.id,
  parentId,
});
const fence = String.fromCharCode(96).repeat(3);

test('plain prose becomes one explicit branch memo and keeps the exact original note', () => {
  const book = initializeBoard(createNotebook('Existing'));
  const workspace = workspaceFor(book);
  const raw = 'The AI reply did not use the requested format.\n\nKeep every line, including this one.';
  const recovery = inspectAiRecovery(raw, branchContext(book));
  assert.equal(recovery.raw, raw);
  assert.equal(recovery.candidates.length, 1);
  const candidate = recovery.candidates[0];
  assert.equal(candidate.kind, 'memo');
  assert.equal(candidate.mode, 'branch');
  assert.equal(candidate.ready, true);
  assert.equal(candidate.preview.count, 1);
  assert.equal(candidate.preview.branches[0].text, 'AIからのメモ');
  assert.equal(candidate.preview.branches[0].note, raw);

  const before = clone(workspace);
  assert.throws(
    () => applyAiRecoveryCandidate(workspace, raw, branchContext(book), candidate.id, {}),
    /カードを選んで/,
  );
  assert.deepEqual(workspace, before);

  const preview = previewAiRecoveryCandidate(raw, branchContext(book), candidate.id);
  assert.equal(preview.preview.branches[0].note, raw);
  const result = applyAiRecoveryCandidate(
    workspace, raw, branchContext(book), candidate.id, { selectedIndexes: [0] },
  );
  assert.equal(result.addedCount, 1);
  const added = getNode(workspace.notebooks[0], result.addedIds[0]);
  assert.equal(added.text, 'AIからのメモ');
  assert.equal(added.note, raw);
  assert.equal(workspace.notebooks[0].nodes.length, before.notebooks[0].nodes.length + 1);
});

test('plain prose in notebook mode previews and imports an explicit root plus memo card', () => {
  const workspace = workspaceFor(initializeBoard(createNotebook('Existing')));
  const raw = 'A complete answer that should be saved without losing its wording.';
  const options = { mode: 'notebook' };
  const candidate = inspectAiRecovery(raw, options).candidates[0];
  assert.equal(candidate.kind, 'memo');
  assert.equal(candidate.preview.mode, 'notebook');
  assert.equal(candidate.preview.title, 'AIからのメモ');
  assert.equal(candidate.preview.count, 2);
  assert.equal(candidate.preview.branches[0].note, raw);

  const before = clone(workspace);
  const result = applyAiRecoveryCandidate(
    workspace, raw, options, candidate.id, { selectedIndexes: [0] },
  );
  assert.equal(result.addedCount, 2);
  assert.equal(workspace.notebooks.length, before.notebooks.length + 1);
  const imported = workspace.notebooks.at(-1);
  assert.equal(getNode(imported, imported.rootId).text, 'AIからのメモ');
  assert.equal(imported.nodes.length, 2);
  assert.equal(imported.nodes.find((node) => node.parentId === imported.rootId).note, raw);
});

test('memo over the note limit is retained as unavailable and never truncated', () => {
  const book = createNotebook('Existing');
  const workspace = workspaceFor(book);
  const raw = 'x'.repeat(LIMITS.note + 1);
  const before = clone(workspace);
  const recovery = inspectAiRecovery(raw, branchContext(book));
  assert.equal(recovery.candidates.length, 1);
  assert.equal(recovery.candidates[0].ready, false);
  assert.match(recovery.candidates[0].reason, new RegExp(String(LIMITS.note)));
  assert.equal(recovery.candidates[0].raw, raw);
  assert.throws(
    () => previewAiRecoveryCandidate(raw, branchContext(book), recovery.candidates[0].id),
    new RegExp(String(LIMITS.note)),
  );
  assert.deepEqual(workspace, before);
});

test('a valid response for another mode is only a candidate and branch IDs stay bound', () => {
  const book = createNotebook('Existing');
  const otherParent = addNode(book, book.rootId, 'Other destination');
  const branchParent = addNode(book, book.rootId, 'Consulted destination');
  const workspace = workspaceFor(book);
  const notebookRaw = JSON.stringify({
    version: 2,
    kind: 'notebook',
    title: 'Imported notebook',
    note: '',
    children: [{ text: 'One thought', note: '', children: [] }],
  });
  const branchOptions = branchContext(book, branchParent.id);
  const notebookCandidate = inspectAiRecovery(notebookRaw, branchOptions).candidates[0];
  assert.equal(notebookCandidate.mode, 'notebook');
  assert.equal(notebookCandidate.modeMismatch, true);
  assert.equal(workspace.notebooks.length, 1);
  assert.equal(book.nodes.length, 3);

  const branchRaw = branchPayload(book, branchParent.id, [
    { text: 'Correctly bound branch', note: '', children: [] },
  ]);
  const notebookOptions = {
    mode: 'notebook',
    notebookId: book.id,
    parentId: branchParent.id,
  };
  const branchCandidate = inspectAiRecovery(branchRaw, notebookOptions).candidates[0];
  assert.equal(branchCandidate.mode, 'branch');
  assert.equal(branchCandidate.modeMismatch, true);

  const beforeWrongTarget = clone(workspace);
  const wrongTargetOptions = {
    mode: 'notebook',
    notebookId: book.id,
    parentId: otherParent.id,
  };
  const wrongTarget = inspectAiRecovery(branchRaw, wrongTargetOptions);
  assert.equal(wrongTarget.candidates.length, 0);
  assert.equal(wrongTarget.unimported[0].raw, branchRaw);
  assert.deepEqual(workspace, beforeWrongTarget);
  assert.throws(
    () => applyAiRecoveryCandidate(
      workspace, branchRaw, wrongTargetOptions, branchCandidate.id, { selectedIndexes: [0] },
    ),
    /候補が見つかりません/,
  );
  assert.deepEqual(workspace, beforeWrongTarget);
});

test('multiple fenced candidates require separate preview and apply; surrounding and other raw remain visible', () => {
  const book = createNotebook('Existing');
  const workspace = workspaceFor(book);
  const first = branchPayload(book, book.rootId, [
    { text: 'First candidate', note: '', children: [] },
  ]);
  const second = '# Second candidate';
  const firstBlock = fence + 'json\n' + first + '\n' + fence;
  const secondBlock = fence + 'markdown\n' + second + '\n' + fence;
  const raw = 'Before the first block.\n' + firstBlock +
    '\nBetween the two blocks.\n' + secondBlock + '\nAfter the second block.';
  const recovery = inspectAiRecovery(raw, branchContext(book));
  assert.equal(recovery.candidates.length, 2);
  assert.equal(recovery.candidates[0].raw, firstBlock);
  assert.equal(recovery.candidates[1].raw, secondBlock);
  assert.deepEqual(recovery.unimported.map((item) => item.raw), [
    'Before the first block.\n',
    '\nBetween the two blocks.\n',
    '\nAfter the second block.',
  ]);

  const preview = previewAiRecoveryCandidate(raw, branchContext(book), recovery.candidates[0].id);
  assert.equal(preview.preview.branches[0].text, 'First candidate');
  assert(preview.unimported.some((item) => item.raw === secondBlock));
  assert(preview.unimported.some((item) => item.raw.includes('Between the two blocks.')));

  const result = applyAiRecoveryCandidate(
    workspace, raw, branchContext(book), recovery.candidates[0].id, { selectedIndexes: [0] },
  );
  assert.equal(result.addedCount, 1);
  const children = workspace.notebooks[0].nodes.filter((node) => node.parentId === book.rootId);
  assert.deepEqual(children.map((node) => node.text), ['First candidate']);
  assert.equal(workspace.notebooks[0].nodes.some((node) => node.text === 'Second candidate'), false);
});

test('broken JSON is unimported raw, never a structured or prose memo candidate', () => {
  const book = createNotebook('Existing');
  const raw = fence + 'json\n{ definitely broken\n' + fence;
  const recovery = inspectAiRecovery(raw, branchContext(book));
  assert.equal(recovery.candidates.length, 0);
  assert.equal(recovery.unimported.length, 1);
  assert.equal(recovery.unimported[0].raw, raw);
  assert.match(recovery.unimported[0].reason, /JSON/);
});

test('a single fence never hides its surrounding text, and an oversized answer stays intact', () => {
  const book = createNotebook('Existing');
  const answer = branchPayload(book, book.rootId, [
    { text: 'Inside the block', note: '', children: [] },
  ]);
  const block = fence + 'json\n' + answer + '\n' + fence;
  const raw = 'Preface that must remain visible.\n' + block + '\nPostscript that must remain visible.';
  const recovery = inspectAiRecovery(raw, branchContext(book));
  assert.equal(recovery.candidates.length, 1);
  assert.deepEqual(recovery.unimported.map((item) => item.raw), [
    'Preface that must remain visible.\n',
    '\nPostscript that must remain visible.',
  ]);
  assert.equal(recovery.raw, raw);

  const tooLong = 'a'.repeat(TRANSFER_LIMITS.input + 1);
  const oversized = inspectAiRecovery(tooLong, branchContext(book));
  assert.equal(oversized.candidates.length, 0);
  assert.equal(oversized.unimported[0].raw, tooLong);
  assert.match(oversized.unimported[0].reason, new RegExp(String(TRANSFER_LIMITS.input)));
});
