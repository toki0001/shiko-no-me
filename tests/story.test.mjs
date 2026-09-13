import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdeaStory } from '../dist/story.mjs';
import { validateNotebook } from '../dist/model.mjs';

test('the authored idea story is valid, independent, and labels its reconstruction', () => {
  const first = createIdeaStory(), second = createIdeaStory();
  validateNotebook(first.notebook);
  assert.equal(first.notebook.nodes.length, 25);
  assert.equal(first.notebook.frames.length, 6);
  assert.equal(first.steps.length, 7);
  assert.notEqual(first.notebook.id, second.notebook.id);
  assert(first.notebook.nodes[0].note.includes('再構成'));
  assert(first.notebook.nodes.some(node => node.text === '承認してから枝に追加する'));
  assert(first.notebook.nodes.some(node => node.note.includes('比較のために補った別案')));
  assert(first.notebook.nodes.some(node => node.text.includes('次の判断がぶれる')));
  first.notebook.nodes[0].text = 'Local changes do not affect the published sample';
  assert.equal(second.notebook.nodes[0].text, '思考の芽が生まれるまで');
});
