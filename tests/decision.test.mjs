import test from 'node:test';
import assert from 'node:assert/strict';
import { addNode, createNotebook, getNode, updateNode, validateNotebook } from '../dist/model.mjs';
import { comparisonFor, decisionSummary, templateNotebook } from '../dist/decision-model.mjs';

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

test('decision summary groups statuses with reasons and excludes other comparison levels', () => {
  const book = createNotebook('問い', '背景のメモ');
  const nodes = ['growing', 'rejected', 'parked', 'adopted'].map((state) => {
    const node = addNode(book, book.rootId, `${state}案`, `${state}の理由`);
    updateNode(book, node.id, { state });
    return node;
  });
  addNode(book, nodes[0].id, '範囲外の詳細', '混ぜない');
  const before = structuredClone(book);
  const summary = decisionSummary(book, nodes[1].id);
  assert.match(summary, /^# 判断まとめ：問い/);
  assert.match(summary, /## 問いの背景\n\n> 背景のメモ/);
  assert.match(
    summary,
    /## 採用[\s\S]*adoptedの理由[\s\S]*## 保留[\s\S]*parkedの理由[\s\S]*## 見送り[\s\S]*rejectedの理由[\s\S]*## 考え中[\s\S]*growingの理由/,
  );
  assert.doesNotMatch(summary, /範囲外|混ぜない/);
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
