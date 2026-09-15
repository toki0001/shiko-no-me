import test from 'node:test';
import assert from 'node:assert/strict';
import { BoardView } from '../dist/board-view.mjs';

function harness({ readOnly = false, multiple = false, ready = true } = {}) {
  const calls = [];
  const view = Object.create(BoardView.prototype);
  Object.assign(view, {
    pointers: new Map(), lastTap: null, drawGeometry() {},
    callbacks: {
      readOnly: () => readOnly, multiple: () => multiple,
      select: (id) => { calls.push(['select', id]); return ready; },
      edit: (id) => calls.push(['edit', id]),
      add: (id) => calls.push(['add', id]),
      gesture: () => calls.push(['drag']),
      clearFrame() {},
    },
  });
  function tap(pointerType = 'mouse', extra = {}) {
    view.pointers.set(1, {});
    view.gesture = { pointerId: 1, type: 'cards', cardId: 'a', pointerType, moved: false, ...extra };
    view.pointerUp({ pointerId: 1, clientX: 100, clientY: 100 });
  }
  return { calls, view, tap };
}

test('mouse selects first, then opens the same card without adding a branch, also read-only', () => {
  for (const readOnly of [false, true]) {
    const h = harness({ readOnly });
    h.tap(); h.tap();
    assert.deepEqual(h.calls, [['select', 'a'], ['edit', 'a']]);
  }
});

test('touch double tap still adds a branch, and read-only touch never adds or edits', () => {
  const h = harness(); h.tap('touch'); h.tap('touch');
  assert.deepEqual(h.calls, [['select', 'a'], ['add', 'a']]);
  const r = harness({ readOnly: true }); r.tap('touch'); r.tap('touch');
  assert.deepEqual(r.calls, [['select', 'a'], ['select', 'a']]);
});

test('different cards, Shift, multiple selection and rejected selection do not trigger editing', () => {
  for (const options of [{ multiple: true }, { ready: false }]) {
    const h = harness(options); h.tap(); h.tap();
    assert(h.calls.every(([action]) => action === 'select'));
  }
  const h = harness(); h.tap(); h.tap('mouse', { cardId: 'b' });
  h.tap('mouse', { shiftKey: true }); h.tap();
  assert(h.calls.every(([action]) => action === 'select'));
});

test('dragging and mixed pointer input do not become double clicks', () => {
  const h = harness(); h.tap(); h.tap('mouse', { moved: true }); h.tap();
  assert.deepEqual(h.calls, [['select', 'a'], ['drag'], ['select', 'a']]);
  const mixed = harness(); mixed.tap('touch'); mixed.tap('mouse');
  assert(mixed.calls.every(([action]) => action === 'select'));
});
