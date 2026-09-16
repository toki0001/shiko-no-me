import test from 'node:test';
import assert from 'node:assert/strict';
import {
  alignmentContext,
  alignTranslation,
  CARD,
  moveFrame,
  moveCards,
} from '../dist/board-model.mjs';
import { BoardView } from '../dist/board-view.mjs';

const rect = (x, y, width = 224, height = 116) => ({ x, y, width, height });
const context = { moving: rect(0, 0), targets: [rect(400, 200)] };

test('edges snap within six screen pixels at every zoom, and beyond it stay free', () => {
  for (const scale of [0.25, 0.5, 1, 1.75]) {
    const aligned = alignTranslation(context, 20, 200 - 5 / scale, scale);
    assert.equal(aligned.dy, 200);
    assert.equal(aligned.dx, 20);
    assert.equal(aligned.guides[0].axis, 'y');
    assert.equal(aligned.guides[0].at, 200);
    const outside = alignTranslation(context, 20, 200 - 7 / scale, scale);
    assert.equal(outside.dy, 200 - 7 / scale);
    assert.equal(outside.guides.length, 0);
  }
});

test('unequal frames align centers and opposite edges, with guides covering both objects', () => {
  const c = { moving: rect(0, 0, 300, 240), targets: [rect(600, 500, 400, 300)] };
  const centered = alignTranslation(c, 647, 533);
  assert.equal(centered.dx, 650);
  assert.equal(centered.dy, 530);
  assert.equal(centered.guides.length, 2);
  assert.deepEqual(
    centered.guides.find((g) => g.axis === 'x'),
    { axis: 'x', at: 800, from: 488, to: 812 },
  );
  const touching = alignTranslation(c, 302, 10);
  assert.equal(touching.dx, 300);
});

test('Alt bypass and empty references keep raw movement without guides', () => {
  assert.deepEqual(alignTranslation(context, 399, 198, 1, true), { dx: 399, dy: 198, guides: [] });
  assert.deepEqual(alignTranslation({ ...context, targets: [] }, 399, 198), {
    dx: 399,
    dy: 198,
    guides: [],
  });
  assert.deepEqual(alignTranslation(null, 399, 198), { dx: 399, dy: 198, guides: [] });
});

test('group uses its bounding box and excludes hidden cards and its containing frames', () => {
  const book = {
    nodes: [
      { id: 'a', position: { x: 20, y: 60 } },
      { id: 'b', position: { x: 280, y: 90 } },
      { id: 'c', position: { x: 700, y: 300 } },
      { id: 'hidden', position: { x: 21, y: 61 } },
    ],
    frames: [{ id: 'f', ...rect(0, 0, 550, 240), nodeIds: ['a', 'b'] }],
  };
  const before = structuredClone(book);
  const group = alignmentContext(
    book,
    { type: 'cards', ids: ['a', 'b'] },
    new Set(['a', 'b', 'c']),
  );
  assert.deepEqual(group.moving, rect(20, 60, 484, 146));
  assert.deepEqual(group.targets, [rect(700, 300)]);
  const frame = alignmentContext(
    book,
    { type: 'frame', frameId: 'f', ids: ['a', 'b'] },
    new Set(['a', 'b', 'c']),
  );
  assert.deepEqual(frame.targets, [rect(700, 300)]);
  assert.deepEqual(book, before);
  assert.equal(alignmentContext(book, { type: 'resize', ids: [] }), null);
  const delta = alignTranslation(group, 20, 243);
  moveCards(book, ['a', 'b'], delta.dx, delta.dy);
  assert.equal(book.nodes[1].position.x - book.nodes[0].position.x, 260);
  assert.equal(book.nodes[1].position.y - book.nodes[0].position.y, 30);
  moveFrame(before, 'f', 50, 80);
  assert.deepEqual(before.nodes[0].position, { x: 70, y: 140 });
});

test('release uses final pointer location, commits once and clears temporary guides; cancellation never commits', () => {
  const commits = [];
  let clears = 0;
  const view = Object.create(BoardView.prototype);
  const gesture = () => ({
    pointerId: 1,
    type: 'cards',
    ids: ['a'],
    moved: true,
    x: 100,
    y: 100,
    view: { scale: 1 },
    alignment: context,
    dx: 10,
    dy: 10,
  });
  Object.assign(view, {
    pointers: new Map([[1, {}]]),
    gesture: gesture(),
    alignmentGuides: {
      replaceChildren() {
        clears++;
      },
    },
    drawGeometry() {},
    callbacks: { gesture: (g) => commits.push(g) },
  });
  view.pointerUp({ pointerId: 1, clientX: 120, clientY: 297 });
  assert.equal(commits.length, 1);
  assert.equal(commits[0].dy, 200);
  assert.equal(view.gesture, null);
  assert.equal(clears, 1);
  view.gesture = gesture();
  view.cancelGesture();
  assert.equal(commits.length, 1);
  assert.equal(clears, 2);
  assert.equal(view.pointers.size, 0);
});
