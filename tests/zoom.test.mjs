import test from 'node:test';
import assert from 'node:assert/strict';
import { BoardView } from '../dist/board-view.mjs';

function harness() {
  const view = Object.create(BoardView.prototype);
  Object.assign(view, { view: { x: 30, y: 40, scale: 1 }, transform() {}, container: { clientHeight: 700, getBoundingClientRect: () => ({ left: 10, top: 20, width: 900, height: 700 }) } });
  const wheel = (deltaY, extra = {}) => view.wheel({ target: { closest: () => null }, preventDefault() {}, clientX: 360, clientY: 270, deltaY, deltaX: 0, deltaMode: 0, ctrlKey: false, metaKey: false, ...extra });
  return { view, wheel };
}

test('plain wheel zooms around a stable cursor world point, not a pan', () => {
  const { view, wheel } = harness();
  const before = { x: (350 - view.view.x) / view.view.scale, y: (250 - view.view.y) / view.view.scale };
  wheel(-50); assert(view.view.scale > 1 && view.view.scale < 1.1);
  assert(Math.abs((350 - view.view.x) / view.view.scale - before.x) < 1e-9);
  assert(Math.abs((250 - view.view.y) / view.view.scale - before.y) < 1e-9);
  wheel(50); assert(Math.abs(view.view.scale - 1) < 1e-9);
});

test('fractional trackpad input stays continuous and event splitting is equivalent', () => {
  const a = harness(), b = harness();
  a.wheel(-.25, { ctrlKey: true }); assert(a.view.view.scale > 1 && a.view.view.scale < 1.001);
  for (let i = 1; i < 40; i++) a.wheel(-.25, { ctrlKey: true });
  b.wheel(-10, { ctrlKey: true }); assert(Math.abs(a.view.view.scale - b.view.view.scale) < 1e-9);
});

test('wheel units normalize, huge input is bounded, and editor scroll is untouched', () => {
  const a = harness(), b = harness(); a.wheel(-2, { deltaMode: 1 }); b.wheel(-32);
  assert.equal(a.view.view.scale, b.view.view.scale);
  const c = harness(); c.wheel(-1, { deltaMode: 2 }); assert(c.view.view.scale < 1.11);
  const before = { ...c.view.view }; c.wheel(99, { target: { closest: () => ({}) }, preventDefault: () => assert.fail('must not capture editor scroll') });
  assert.deepEqual(c.view.view, before);
  c.wheel(NaN); assert.deepEqual(c.view.view, before);
});
