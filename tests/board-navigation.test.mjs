import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { boundsOf } from '../dist/board-model.mjs';
import { BoardView, framesForVisibleRows } from '../dist/board-view.mjs';

class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag;
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.dataset = {};
    this.classes = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => this.classes.add(name)),
      contains: (name) => this.classes.has(name),
      toggle: (name, force) => {
        const enabled = force ?? !this.classes.has(name);
        if (enabled) this.classes.add(name);
        else this.classes.delete(name);
        return enabled;
      },
    };
    this.style = { setProperty() {} };
  }
  set className(value) { this.classes = new Set(value.split(/\s+/).filter(Boolean)); }
  get className() { return [...this.classes].join(' '); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = [...children]; }
  addEventListener(type, callback) { this.listeners.set(type, callback); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name); }
  querySelector(selector) {
    return this.children.find((child) =>
      selector.startsWith('.') && child.classList.contains(selector.slice(1)),
    ) ?? null;
  }
  closest() { return null; }
  focus() { globalThis.document.activeElement = this; }
}

function makeHarness({ nodes, rows, frames = [], selectedIds = new Set(), selectedFrame = null }) {
  const previousDocument = globalThis.document;
  globalThis.document = {
    activeElement: null,
    createElement: (tag) => new MockElement(tag),
    createElementNS: (_namespace, tag) => new MockElement(tag),
  };
  const calls = { branch: [], select: [], clearFrame: 0, add: [], edit: [], gesture: [] };
  const container = new MockElement('main');
  container.contains = () => false;
  container.clientWidth = 800;
  container.clientHeight = 600;
  const view = Object.create(BoardView.prototype);
  Object.assign(view, {
    container,
    callbacks: {
      readOnly: () => true,
      stateLabel: (state) => state,
      select: (...args) => { calls.select.push(args); return true; },
      branch: (id) => calls.branch.push(id),
      collapsed: () => false,
      clearFrame: () => calls.clearFrame++,
      add: (...args) => calls.add.push(args),
      edit: (...args) => calls.edit.push(args),
      gesture: (...args) => calls.gesture.push(args),
    },
    cards: new MockElement(),
    frames: new MockElement(),
    cardElements: new Map(),
    frameElements: new Map(),
    pointers: new Map(),
    lastTap: null,
    cancelGesture() {},
    drawGeometry() {},
    fit() {},
    transform() {},
  });
  const book = { id: 'book', rootId: nodes[0].id, nodes, frames };
  view.render(book, rows, selectedIds, selectedFrame);
  return {
    calls,
    view,
    book,
    restore() {
      if (previousDocument === undefined) delete globalThis.document;
      else globalThis.document = previousDocument;
    },
  };
}

const root = { id: 'root', text: '問い', state: 'growing', parentId: null, position: { x: 0, y: 0 } };
const child = { id: 'child', text: '次の行動', state: 'growing', parentId: 'root', position: { x: 332, y: 0 } };

test('branch toggle is an accessible sibling control and never selects or starts a drag', () => {
  const h = makeHarness({ nodes: [root, child], rows: [{ node: root, depth: 0 }], selectedIds: new Set(['root']) });
  try {
    const card = h.view.cardElements.get('root');
    const [body, toggle] = card.children;
    assert.equal(body.tagName, 'button');
    assert(toggle.classList.contains('branch-toggle'));
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.match(toggle.getAttribute('aria-label'), /枝をたたむ：問い（1件）/);
    assert.equal(body.getAttribute('aria-pressed'), 'true');

    for (const detail of [1, 0]) {
      let prevented = false, stopped = false;
      toggle.listeners.get('click')({
        detail,
        preventDefault() { prevented = true; },
        stopPropagation() { stopped = true; },
      });
      assert(prevented && stopped);
    }
    assert.deepEqual(h.calls.branch, ['root', 'root']);
    assert.deepEqual(h.calls.select, []);
    assert.deepEqual(h.calls.add, []);
    assert.deepEqual(h.calls.edit, []);
    assert.deepEqual(h.calls.gesture, []);
    assert.equal(card.classList.contains('is-selected'), true);

    h.view.pointerDown({
      button: 0,
      pointerId: 3,
      target: { closest: (selector) => selector.includes('.branch-toggle') ? toggle : null },
    });
    assert.equal(h.view.pointers.size, 0);
    assert.equal(h.view.gesture, undefined);
  } finally { h.restore(); }
});

test('focused branches render only their frames and clear a selection that became hidden', () => {
  const visibleFrame = { id: 'visible', title: '表示中', color: '#4f7d62', nodeIds: ['root'] };
  const hiddenFrame = { id: 'hidden', title: '非表示', color: '#527ca6', nodeIds: ['child'] };
  const h = makeHarness({
    nodes: [root, child],
    rows: [{ node: root, depth: 0 }],
    frames: [visibleFrame, hiddenFrame],
    selectedFrame: 'hidden',
  });
  try {
    assert.deepEqual([...h.view.frameElements.keys()], ['visible']);
    assert.equal(h.view.selectedFrame, null);
    assert.equal(h.calls.clearFrame, 1);
  } finally { h.restore(); }
});

test('frame visibility retains populated visible frames and only keeps empty frames in full-book view', () => {
  const frames = [
    { id: 'visible', nodeIds: ['root'] },
    { id: 'hidden', nodeIds: ['child'] },
    { id: 'empty', nodeIds: [] },
  ];
  assert.deepEqual(
    framesForVisibleRows(frames, new Set(['root']), false).map((frame) => frame.id),
    ['visible'],
  );
  assert.deepEqual(
    framesForVisibleRows(frames, new Set(['root', 'child']), true).map((frame) => frame.id),
    ['visible', 'hidden', 'empty'],
  );
});

test('fit bounds exclude distant frames that are not rendered in the focused branch', () => {
  const visibleFrame = { id: 'visible', x: -24, y: -64, width: 280, height: 200 };
  const hiddenFrame = { id: 'hidden', x: 10000, y: 10000, width: 280, height: 200 };
  const view = Object.create(BoardView.prototype);
  view.book = { frames: [visibleFrame, hiddenFrame] };
  view.rows = [{ node: root }];
  view.frameElements = new Map([['visible', {}]]);
  view.container = { clientWidth: 800, clientHeight: 600 };
  view.view = {};
  view.transform = () => {};
  view.fit();

  const bounds = boundsOf([root], [visibleFrame]);
  const expectedScale = Math.max(0.25, Math.min(1, 704 / bounds.width, 504 / bounds.height));
  assert.equal(view.view.scale, expectedScale);
  assert.equal(view.view.scale, 1);
});

test('branch control preserves the full title width and clears 44px hit targets at 85% zoom', async () => {
  const css = await readFile(new URL('../dist/board.css', import.meta.url), 'utf8');
  assert.match(css, /\.branch-toggle\s*\{[^}]*right:\s*max\(24px,\s*calc\(24px\s*\/\s*var\(--board-scale\)\)\)/s);
  assert.match(css, /\.branch-toggle\s*\{[^}]*width:\s*max\(44px,\s*calc\(44px\s*\/\s*var\(--board-scale\)\)\)[^}]*height:\s*max\(44px,\s*calc\(44px\s*\/\s*var\(--board-scale\)\)\)/s);
  assert.match(css, /\.thought-card\.has-branch-toggle \.card-meta\s*\{[^}]*width:\s*calc\(100%\s*-\s*72px\s*\/\s*var\(--board-scale\)\)/s);
  assert.doesNotMatch(css, /\.thought-card\.has-branch-toggle \.card-text\s*\{/);
  assert.match(css, /\.board\.is-branch-overview \.thought-card\.has-branch-toggle \.card-meta\s*\{[^}]*width:\s*100%/s);

  const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  for (const scale of [0.85, 1])
    for (const width of [160, 224])
      for (const height of [96, 116, 140, 164, 188]) {
        const lines = Math.max(1, Math.floor((height - 64) / 24.8));
        const cardWidth = width * scale, cardHeight = height * scale;
        const title = {
          left: 16 * scale,
          right: (width - 16) * scale,
          top: 16 * scale,
          bottom: (16 + lines * 24.8) * scale,
        };
        const toggle = {
          left: cardWidth - 68,
          right: cardWidth - 24,
          top: cardHeight + 4 - 44,
          bottom: cardHeight + 4,
        };
        assert.equal(toggle.right - toggle.left, 44);
        assert.equal(toggle.bottom - toggle.top, 44);
        assert(!overlaps(title, toggle), `title overlaps at ${width}x${height}, scale ${scale}`);

        const port = (x, y) => ({ left: x - 22, right: x + 22, top: y - 22, bottom: y + 22 });
        for (const [name, target] of [
          ['top', port(cardWidth / 2, 0)],
          ['right', port(cardWidth, cardHeight / 2)],
          ['bottom', port(width * 0.33 * scale, cardHeight)],
          ['left', port(0, cardHeight / 2)],
        ]) assert(!overlaps(target, toggle), `${name} port overlaps at ${width}x${height}, scale ${scale}`);

        const contentWidth = width - 32;
        const metaWidth = contentWidth - 72 / scale;
        const meta = { left: 16 * scale, right: (16 + metaWidth) * scale };
        assert(meta.right < toggle.left, `metadata overlaps at ${width}px, scale ${scale}`);
      }
});
