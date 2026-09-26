import test from 'node:test';
import assert from 'node:assert/strict';
import { boundsOf } from '../dist/board-model.mjs';
import { BoardView, framesForVisibleRows } from '../dist/board-view.mjs';
import { createGoalStory } from '../dist/goal-story.mjs';

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

function makeHarness({ nodes, rows, frames = [], selectedIds = new Set(), selectedFrame = null, collapsed = false }) {
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
      collapsed: (id) => typeof collapsed === 'function' ? collapsed(id) : collapsed,
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
const grandchild = { id: 'grandchild', text: '関連する準備', state: 'growing', parentId: 'child', position: { x: 664, y: 0 } };

test('branch toggle is an accessible sibling control and never selects or starts a drag', () => {
  const h = makeHarness({ nodes: [root, child, grandchild], rows: [{ node: root, depth: 0 }], selectedIds: new Set(['root']) });
  try {
    const card = h.view.cardElements.get('root');
    const [body, toggle] = card.children;
    assert.equal(body.tagName, 'button');
    assert(toggle.classList.contains('branch-toggle'));
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.match(toggle.getAttribute('aria-label'), /関連カードをたたむ：問い（この先の合計2枚、直接つながる1枚）/);
    assert.equal(toggle.children[0].tagName, 'svg');
    assert.equal(toggle.children.length, 1, 'the descendant count appears only while collapsed');
    assert.equal(toggle.children[0].getAttribute('aria-hidden'), 'true');
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
    assert.equal(globalThis.document.activeElement, toggle);

    h.view.pointerDown({
      button: 0,
      pointerId: 3,
      target: { closest: (selector) => selector.includes('.branch-toggle') ? toggle : null },
    });
    assert.equal(h.view.pointers.size, 0);
    assert.equal(h.view.gesture, undefined);
  } finally { h.restore(); }
});

test('collapsed branch uses a compact disclosure icon and one keyboard-style activation', () => {
  const h = makeHarness({
    nodes: [root, child, grandchild],
    rows: [{ node: root, depth: 0 }],
    collapsed: (id) => id === 'root',
  });
  try {
    const toggle = h.view.cardElements.get('root').children[1];
    const icon = toggle.children[0];
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.match(toggle.getAttribute('aria-label'), /関連カードをひらく：問い（隠れている2枚、直接つながる1枚）/);
    assert.equal(icon.classList.contains('branch-toggle-icon'), true);
    assert.equal(toggle.children[1].classList.contains('branch-hidden-count'), true);
    assert.equal(toggle.children[1].textContent, '2');
    assert.equal(toggle.children[1].getAttribute('aria-hidden'), 'true');
    assert.equal(toggle.listeners.has('keydown'), false);

    let prevented = false, stopped = false;
    toggle.listeners.get('click')({
      detail: 0,
      preventDefault() { prevented = true; },
      stopPropagation() { stopped = true; },
    });
    assert(prevented && stopped);
    assert.deepEqual(h.calls.branch, ['root']);
    assert.equal(globalThis.document.activeElement, toggle);
  } finally { h.restore(); }
});

test('collapsed controls report all hidden descendants for the 73-card goal story', () => {
  const { notebook } = createGoalStory();
  const rootNode = notebook.nodes.find((node) => node.id === notebook.rootId);
  const category = notebook.nodes.find((node) => node.parentId === rootNode.id);
  const rootHarness = makeHarness({
    nodes: notebook.nodes,
    rows: [{ node: rootNode, depth: 0 }],
    collapsed: true,
  });
  try {
    const toggle = rootHarness.view.cardElements.get(rootNode.id).querySelector('.branch-toggle');
    assert.equal(toggle.children[1].textContent, '72');
    assert.match(toggle.getAttribute('aria-label'), /隠れている72枚、直接つながる8枚/);
  } finally { rootHarness.restore(); }

  const categoryHarness = makeHarness({
    nodes: notebook.nodes,
    rows: [{ node: category, depth: 1 }],
    collapsed: true,
  });
  try {
    const toggle = categoryHarness.view.cardElements.get(category.id).querySelector('.branch-toggle');
    assert.equal(toggle.children[1].textContent, '8');
    assert.match(toggle.getAttribute('aria-label'), /隠れている8枚、直接つながる8枚/);
  } finally { categoryHarness.restore(); }
});

test('freeform cards hide the undecided label while keeping decisive state visible and accessible', () => {
  const decided = { ...child, id: 'adopted', text: '決めた案', state: 'adopted' };
  const h = makeHarness({
    nodes: [root, child, decided],
    rows: [{ node: root, depth: 0 }, { node: child, depth: 1 }, { node: decided, depth: 1 }],
  });
  try {
    const undecidedCard = h.view.cardElements.get('child');
    const decidedCard = h.view.cardElements.get('adopted');
    assert.equal(undecidedCard.children[0].getAttribute('aria-label'), '次の行動、growing');
    assert.equal(undecidedCard.children[0].children[1].classList.contains('is-empty'), true);
    assert.equal(undecidedCard.children[0].children[1].children.length, 0);
    assert.equal(decidedCard.children[0].children[1].children[0].textContent, 'adopted');
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

test('compact bottom-port placement tracks zoomed card width and returns to normal above 156px', () => {
  const card = new MockElement('article');
  card.style.width = '160px';
  const container = new MockElement('main');
  const view = Object.create(BoardView.prototype);
  Object.assign(view, {
    world: { style: {} },
    container,
    view: { x: 0, y: 0, scale: 0.85 },
    book: { nodes: [root] },
    cardElements: new Map([['root', card]]),
    callbacks: {},
  });

  view.transform();
  assert.equal(card.classList.contains('is-compact-controls'), true);
  view.view.scale = 0.98;
  view.transform();
  assert.equal(card.classList.contains('is-compact-controls'), false);
});
