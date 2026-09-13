import test from 'node:test';
import assert from 'node:assert/strict';
import { UndoHistory } from '../dist/history.mjs';

test('text and geometry can undo twice and redo twice in order', () => {
  const h = new UndoHistory();
  const a = { kind: 'content', text: 'before', x: 10 }, b = { kind: 'content', text: 'after', x: 10 }, c = { kind: 'content', text: 'after', x: 42 };
  h.push(a); h.push(b); assert.deepEqual(h.undo(c), b); assert.deepEqual(h.undo(b), a);
  assert.deepEqual(h.redo(a), b); assert.deepEqual(h.redo(b), c); assert.equal(h.canRedo, false);
});
test('new edit after undo discards the old forward route', () => {
  const h = new UndoHistory(); h.push('a'); h.undo('b'); assert(h.canRedo);
  h.push('a'); assert(!h.canRedo); assert.equal(h.redo('c'), null);
  assert.equal(h.undo('c'), 'a'); assert.equal(h.redo('a'), 'c');
});
test('viewport entries remain distinct from document content', () => {
  const h = new UndoHistory(), doc = { kind: 'content', workspace: { text: 'original' } }, viewA = { kind: 'view', activeId: 'one', view: { x: 1, y: 2, scale: 1 } }, viewB = { ...viewA, view: { x: 40, y: 50, scale: .8 } };
  h.push(doc); h.push(viewA); assert.equal(h.peekUndo().kind, 'view');
  assert.deepEqual(h.undo(viewB), viewA); assert.equal(h.peekRedo().kind, 'view'); assert.equal(h.peekUndo().kind, 'content');
  assert.deepEqual(h.redo(viewA), viewB);
});
test('history is bounded, empty navigation is inert, and clearing removes both routes', () => {
  const h = new UndoHistory(2); assert.equal(h.undo('unused'), null); h.push(1); h.push(2); h.push(3);
  assert.equal(h.length, 2); assert.equal(h.undo(4), 3); assert.equal(h.undo(3), 2); assert.equal(h.undo(2), null);
  h.clear(); assert.equal(h.length, 0); assert(!h.canRedo);
});
