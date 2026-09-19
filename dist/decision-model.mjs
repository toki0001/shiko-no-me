import { addNode, children, createNotebook, getNode, STATES, updateNode } from './model.mjs';
import { initializeBoard } from './board-model.mjs';

// Read-only selector. Returned nodes are references to the notebook's nodes;
// callers apply edits through the existing model transactions.
export function comparisonFor(book, nodeId = book.rootId) {
  const selected = getNode(book, nodeId ?? book.rootId);
  if (!selected) throw new Error('選んだ枝が見つかりません。');
  const direct = children(book, selected.id);
  if (direct.length || selected.parentId === null)
    return { question: selected, candidates: direct };
  const question = getNode(book, selected.parentId);
  if (!question) throw new Error('追加先の枝が見つかりません。');
  return { question, candidates: children(book, question.id) };
}

// Keep user text literal in headings and quote blocks, including Markdown/HTML.
const literal = (value) =>
  value
    .replace(/([\\`*_{}\[\]()#+.!|>~-])/g, '\\$1')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;');
const heading = (value) => literal(value.replace(/[\r\n]+/g, ' '));
const quote = (value) =>
  value
    .split(/\r\n|\r|\n/)
    .map((line) => `> ${literal(line)}`)
    .join('\n');

export function decisionSummary(book, nodeId = book.rootId) {
  const { question, candidates } = comparisonFor(book, nodeId);
  const lines = [`# 判断まとめ：${heading(question.text)}`, ''];
  if (question.note.trim()) lines.push('## 問いの背景', '', quote(question.note), '');
  if (!candidates.length) {
    lines.push('比較する選択肢はまだありません。', '');
    return lines.join('\n');
  }
  for (const state of ['adopted', 'parked', 'rejected', 'growing']) {
    const group = candidates.filter((node) => node.state === state);
    if (!group.length) continue;
    lines.push(`## ${STATES[state]}`, '');
    for (const node of group) {
      lines.push(
        `### ${heading(node.text)}`,
        '',
        node.note.trim() ? quote(node.note) : '理由はまだ書かれていません。',
        '',
      );
    }
  }
  return lines.join('\n');
}

export function templateNotebook(title = '週末の学び方を決める') {
  const book = createNotebook(
    title,
    '今週末に使える時間は2時間。読んだだけで終わらず、ひとつ手を動かして理解したい。',
  );
  const options = [
    [
      '小さな作品をひとつ作る',
      'adopted',
      '2時間で完成するものに絞れば、覚えたことを試せる。まずはタイマーを作り、動くところまで進める。',
    ],
    [
      '入門書を1章読む',
      'parked',
      '基礎を整理するにはよさそう。作品づくりでわからなかった箇所が出たら、その章を読む。',
    ],
    [
      '長い動画講座を一気に見る',
      'rejected',
      '今週末の2時間では最後まで見られない。今回は完成させることを優先する。',
    ],
  ];
  for (const [text, state, note] of options) {
    const node = addNode(book, book.rootId, text, note);
    updateNode(book, node.id, { state });
  }
  return initializeBoard(book);
}
