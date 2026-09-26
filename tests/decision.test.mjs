import test from 'node:test';
import assert from 'node:assert/strict';
import { addNode, createNotebook, getNode, updateNode, validateNotebook } from '../dist/model.mjs';
import { comparisonFor, decisionSummary, templateNotebook } from '../dist/decision-model.mjs';
import { createGoalStory } from '../dist/goal-story.mjs';

test('comparison uses immediate children or leaf siblings, never mixes descendant levels', () => {
  const book = createNotebook('問い');
  const a = addNode(book, book.rootId, '案A');
  const b = addNode(book, book.rootId, '案B');
  const detail = addNode(book, a.id, 'Aを実行する方法');
  const before = structuredClone(book);
  assert.deepEqual(comparisonFor(book).candidates, [a, b]);
  assert.deepEqual(comparisonFor(book, b.id).candidates, [a, b]);
  assert.equal(comparisonFor(book, a.id).question, a);
  assert.deepEqual(comparisonFor(book, a.id).candidates, [detail]);
  assert.deepEqual(comparisonFor(book, detail.id).candidates, [detail]);
  assert.equal(comparisonFor(book, null).question, getNode(book, book.rootId));
  assert.deepEqual(book, before);
});

test('comparison preserves manual sibling order and rejects stale selection ids', () => {
  const book = createNotebook('問い');
  const a = addNode(book, book.rootId, '案A');
  const b = addNode(book, book.rootId, '案B');
  a.order = 1;
  b.order = 0;
  assert.deepEqual(comparisonFor(book).candidates, [b, a]);
  assert.throws(() => comparisonFor(book, 'missing'), /選んだ枝が見つかりません/);
  assert.throws(() => decisionSummary(book, 'missing'), /選んだ枝が見つかりません/);
});

test('decision summary groups direct candidates and nests related cards under each candidate', () => {
  const book = createNotebook('問い', '背景のメモ');
  const nodes = ['growing', 'rejected', 'parked', 'adopted'].map((state) => {
    const node = addNode(book, book.rootId, `${state}案`, `${state}の理由`);
    updateNode(book, node.id, { state });
    return node;
  });
  const related = addNode(book, nodes[0].id, '関連カード', '一段下の理由');
  updateNode(book, related.id, { state: 'adopted' });
  const deeper = addNode(book, related.id, 'さらに先のカード', '二段下の理由');
  updateNode(book, deeper.id, { state: 'parked' });
  const before = structuredClone(book);
  const summary = decisionSummary(book, nodes[1].id);
  assert.match(summary, /^# 判断まとめ：問い/);
  assert.match(summary, /## 問いの背景\n\n> 背景のメモ/);
  assert.match(
    summary,
    /## 採用[\s\S]*adoptedの理由[\s\S]*## 保留[\s\S]*parkedの理由[\s\S]*## 見送り[\s\S]*rejectedの理由[\s\S]*## 考え中[\s\S]*growingの理由/,
  );
  assert.equal((summary.match(/^## 採用$/gm) ?? []).length, 1, 'related adopted cards are not regrouped as candidates');
  assert.match(
    summary,
    /### growing案[\s\S]*- 関連カード\n  > 一段下の理由\n  - さらに先のカード\n    > 二段下の理由/,
  );
  assert.deepEqual(book, before);
});

test('decision summary can retain its concise form when related cards are excluded', () => {
  const book = createNotebook('問い');
  const candidate = addNode(book, book.rootId, '案A', '理由A');
  addNode(book, candidate.id, '関連カード', '詳細');
  const summary = decisionSummary(book, book.rootId, { includeRelated: false });
  assert.match(summary, /### 案A/);
  assert.doesNotMatch(summary, /関連カード|詳細/);
});

test('related card titles and notes remain literal in nested Markdown', () => {
  const book = createNotebook('問い');
  const candidate = addNode(book, book.rootId, '案A');
  addNode(book, candidate.id, '[関連](https://example.test)', '<img>\n- 偽の箇条書き');
  const summary = decisionSummary(book);
  assert.ok(summary.includes('- \\[関連\\]\\(https://example\\.test\\)'));
  assert.ok(summary.includes('  > &lt;img\\>\n  > \\- 偽の箇条書き'));
  assert.doesNotMatch(summary, /<img>/);
});

test('summary includes every level of the 73-card goal story in source order without mutation', () => {
  const { notebook } = createGoalStory();
  const before = structuredClone(notebook);
  const summary = decisionSummary(notebook);
  assert.equal((summary.match(/^### /gm) ?? []).length, 8, 'only the eight direct categories are candidates');
  for (const node of notebook.nodes.slice(1)) {
    assert(summary.includes(node.text), `summary includes ${node.text}`);
    if (node.note.trim()) assert(summary.includes(node.note.split(/\r?\n/)[0]), `summary includes the note for ${node.text}`);
  }
  const categoryIndexes = notebook.nodes
    .filter((node) => node.parentId === notebook.rootId)
    .map((node) => summary.indexOf(`### ${node.text}`));
  assert.deepEqual(categoryIndexes, [...categoryIndexes].sort((a, b) => a - b));
  assert.deepEqual(notebook, before);
});

test('summary handles the 500-node and 31-level supported limits', () => {
  const book = createNotebook('最大の問い');
  let parentId = book.rootId;
  let deepest;
  for (let depth = 1; depth <= 31; depth += 1) {
    deepest = addNode(book, parentId, depth === 31 ? '[最深](深さ31)' : `深さ${depth}`);
    parentId = deepest.id;
  }
  deepest.note = '<安全な文字列>';
  for (let index = 0; index < 468; index += 1) addNode(book, book.rootId, `追加案${index + 1}`);
  assert.equal(book.nodes.length, 500);
  validateNotebook(book);
  const before = structuredClone(book);
  const summary = decisionSummary(book);
  assert(summary.includes('- \\[最深\\]\\(深さ31\\)'));
  assert(summary.includes('> &lt;安全な文字列\\>'));
  assert(summary.includes('追加案468'));
  assert.deepEqual(book, before);
});

test('summary explicitly distinguishes no choices and no recorded reason', () => {
  const book = createNotebook('空の問い');
  assert.deepEqual(comparisonFor(book).candidates, []);
  assert.match(decisionSummary(book), /選択肢はまだありません/);
  addNode(book, book.rootId, '理由なし', '  ');
  assert.match(decisionSummary(book), /理由はまだ書かれていません/);
});

test('summary preserves multiline text as quoted literal content instead of Markdown structure', () => {
  const book = createNotebook('問い\n## 偽物');
  addNode(
    book,
    book.rootId,
    '[リンク](https://example.test)',
    '<script>alert(1)</script>\r\n# 見出し\n\n- 箇条書き',
  );
  const summary = decisionSummary(book);
  assert.ok(summary.includes('問い \\#\\# 偽物'));
  assert.ok(summary.includes('\\[リンク\\]\\(https://example\\.test\\)'));
  assert.ok(summary.includes('> &lt;script\\>'));
  assert.ok(summary.includes('> \\# 見出し\n> \n> \\- 箇条書き'));
  assert.doesNotMatch(summary, /<script>/);
});

test('template is an independent valid board using the current notebook schema', () => {
  const book = templateNotebook();
  assert.equal(validateNotebook(book), book);
  assert.equal(book.nodes.length, 4);
  assert.equal(getNode(book, book.rootId).text, '週末の学び方を決める');
  const { candidates } = comparisonFor(book);
  assert.deepEqual(
    candidates.map((node) => node.state),
    ['adopted', 'parked', 'rejected'],
  );
  assert.ok(
    candidates.every(
      (node) => node.note && Number.isFinite(node.position.x) && Number.isFinite(node.position.y),
    ),
  );
  assert.equal(templateNotebook('自分の問い').nodes[0].text, '自分の問い');
  assert.notEqual(templateNotebook().id, book.id);
});
