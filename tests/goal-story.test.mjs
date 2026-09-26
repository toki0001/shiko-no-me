import test from 'node:test';
import assert from 'node:assert/strict';
import { cardRect } from '../dist/board-model.mjs';
import { children, validateNotebook } from '../dist/model.mjs';
import { createGoalStory, GOAL_STORY_SOURCE_URL } from '../dist/goal-story.mjs';

const EXPECTED_CATEGORIES = [
  'コントロール',
  'キレ',
  '変化球',
  '160キロ',
  '運',
  '人間性',
  'メンタル',
  '体づくり',
];

function overlaps(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

test('goal story is a valid 73-card, 8-frame goal tree with 8 actions per category', () => {
  const story = createGoalStory();
  const { notebook } = story;
  validateNotebook(notebook);

  assert.equal(story.kind, 'goal');
  assert.equal(story.steps.length, 9);
  assert.equal(notebook.nodes.length, 73);
  assert.equal(notebook.frames.length, 8);
  assert.deepEqual(story.labels, EXPECTED_CATEGORIES);
  assert.equal(story.steps[0], notebook.rootId);
  assert.equal(notebook.nodes.filter((node) => node.parentId === null).length, 1);

  const ids = notebook.nodes.map((node) => node.id);
  assert.equal(new Set(ids).size, 73);
  assert.equal(new Set(notebook.nodes.map((node) => node.text)).size, 73);
  assert(notebook.nodes.every((node) => node.state === 'growing'));
  assert.equal(notebook.nodes.filter((node) => node.source === 'ai').length, 56);

  const categoryNodes = notebook.nodes.filter((node) => node.parentId === notebook.rootId);
  assert.deepEqual(categoryNodes.map((node) => node.text), EXPECTED_CATEGORIES);
  assert.deepEqual(categoryNodes.map((node) => node.id), story.steps.slice(1));
  for (const category of categoryNodes) {
    assert.equal(children(notebook, category.id).length, 8, `${category.text} must have eight actions`);
  }

  for (const category of EXPECTED_CATEGORIES) {
    const group = story.groups.find((item) => item.label === category);
    const frame = notebook.frames.find((item) => item.id === group.frameId);
    const head = categoryNodes.find((node) => node.id === group.headId);
    assert(head);
    assert(frame);
    assert.equal(group.actionIds.length, 8);
    assert.equal(frame.title, `${EXPECTED_CATEGORIES.indexOf(category) + 1}. ${category}`);
    assert.deepEqual(new Set(frame.nodeIds), new Set([head.id, ...group.actionIds]));
    assert.equal(children(notebook, head.id).filter((node) => node.source === 'human').length, category === '人間性' ? 8 : 0);
  }
});

test('goal story labels the educational reconstruction and cites its primary source', () => {
  const story = createGoalStory();
  const root = story.notebook.nodes.find((node) => node.id === story.notebook.rootId);
  const humanity = story.groups.find((group) => group.label === '人間性');
  const humanityActions = children(story.notebook, humanity.headId).map((node) => node.text);

  assert.equal(story.sourceUrl, GOAL_STORY_SOURCE_URL);
  assert(story.description.includes('再構成'));
  assert(story.description.includes('原表'));
  assert(root.note.includes('再構成'));
  assert(root.note.includes('56行動'));
  assert(root.note.includes(GOAL_STORY_SOURCE_URL));
  assert.deepEqual(humanityActions, [
    'ゴミ拾い',
    '部屋掃除',
    '審判さんへの態度',
    '本を読む',
    '応援される人間になる',
    'プラス思考',
    '道具を大切に使う',
    'あいさつ',
  ]);
});

test('goal story frames and cards are separated, with no title bar covering a card', () => {
  const { notebook } = createGoalStory();
  const cards = notebook.nodes.map((node) => ({ id: node.id, ...cardRect(node) }));
  const colors = new Set(notebook.frames.map((frame) => frame.color));
  assert.equal(colors.size, 8);

  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++)
      assert(!overlaps(cards[i], cards[j]), `${cards[i].id} overlaps ${cards[j].id}`);

  for (const frame of notebook.frames) {
    const titleArea = { x: frame.x, y: frame.y, width: frame.width, height: 44 };
    for (const card of cards)
      assert(!overlaps(titleArea, card), `title of ${frame.title} covers card ${card.id}`);
  }
});

test('goal story creation returns independent notebooks and card ids', () => {
  const first = createGoalStory();
  const second = createGoalStory();
  const firstIds = new Set(first.notebook.nodes.map((node) => node.id));
  const secondIds = new Set(second.notebook.nodes.map((node) => node.id));

  assert.notEqual(first.notebook.id, second.notebook.id);
  assert.equal(firstIds.size, 73);
  assert.equal(secondIds.size, 73);
  assert.equal([...firstIds].some((id) => secondIds.has(id)), false);
  first.notebook.nodes[0].text = 'local change';
  assert.equal(second.notebook.nodes[0].text, 'ドラフト一位指名を8球団から受けたい');
});
