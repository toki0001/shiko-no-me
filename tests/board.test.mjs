import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeBoard,
  validateBoard,
  freePosition,
  overlaps,
  createFrame,
  moveCards,
  moveFrame,
  resizeFrame,
  syncFrameMembership,
  setLineColor,
  connector,
} from '../dist/board-model.mjs';
import {
  createNotebook,
  addNode,
  sampleWorkspace,
  clone,
  children,
  deleteBranch,
  validateNotebook,
  validateWorkspace,
  importNotebooks,
  stageProposals,
  approveProposal,
} from '../dist/model.mjs';
import { save, load, KEY } from '../dist/storage.mjs';
import { BoardView } from '../dist/board-view.mjs';

const fixture = () => {
  const workspace = sampleWorkspace();
  return { workspace, book: workspace.notebooks[0] };
};
const storage = () => {
  const entries = new Map();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
};
const semantic = (book) =>
  book.nodes.map(({ id, parentId, text, note, state, source, order }) => ({
    id,
    parentId,
    text,
    note,
    state,
    source,
    order,
  }));

test('legacy browser save gains positions without changing words, decisions or parentage', () => {
  const { workspace, book } = fixture();
  delete book.frames;
  book.nodes.forEach((node) => {
    delete node.position;
    delete node.lineColor;
    delete node.branchSide;
  });
  const before = semantic(book),
    disk = storage(),
    raw = save(disk, workspace, null);
  const restored = load(disk);
  restored.workspace.notebooks.forEach(initializeBoard);
  assert.deepEqual(semantic(restored.workspace.notebooks[0]), before);
  assert.equal(disk.getItem(KEY), raw);
  const after = clone(restored.workspace);
  restored.workspace.notebooks.forEach(initializeBoard);
  assert.deepEqual(restored.workspace, after);
  validateWorkspace(restored.workspace);
});
test('initial layout does not overlap cards, including a broad legacy notebook', () => {
  const book = createNotebook('root');
  for (let i = 0; i < 80; i++) addNode(book, book.rootId, `n${i}`);
  initializeBoard(book);
  for (let i = 0; i < book.nodes.length; i++)
    for (let j = i + 1; j < book.nodes.length; j++)
      assert(!overlaps(book.nodes[i].position, book.nodes[j].position));
  validateNotebook(book);
});
test('each side adds siblings in vacant positions without moving existing cards', () => {
  for (const side of ['right', 'bottom', 'left', 'top']) {
    const book = createNotebook('theme');
    initializeBoard(book);
    for (let i = 0; i < 8; i++) {
      const old = clone(book.nodes),
        point = freePosition(book, book.rootId, side),
        node = addNode(book, book.rootId, `child${i}`);
      node.position = point;
      node.branchSide = side;
      assert.deepEqual(book.nodes.slice(0, -1), old);
      assert(old.every((prior) => !overlaps(point, prior.position)));
      if (side === 'right') assert(point.x > old[0].position.x);
      if (side === 'left') assert(point.x < old[0].position.x);
      if (side === 'bottom') assert(point.y > old[0].position.y);
      if (side === 'top') assert(point.y < old[0].position.y);
    }
    assert.equal(children(book, book.rootId).length, 8);
    validateNotebook(book);
  }
});
test('node movement and line color never change tree or judgment state', () => {
  const { book } = fixture(),
    before = semantic(book),
    id = book.nodes[1].id;
  moveCards(book, [id], 76, -44);
  setLineColor(book, [id], '#1122Aa');
  assert.deepEqual(semantic(book), before);
  assert.equal(book.nodes[1].lineColor, '#1122Aa');
  validateNotebook(book);
});
test('frame moving preserves internal spacing and leaves outside cards in place', () => {
  const { book } = fixture();
  book.frames = [];
  const frame = createFrame(book, [book.nodes[1].id, book.nodes[2].id], '対象者'),
    before = clone(book),
    relations = semantic(book);
  moveFrame(book, frame.id, 120, -80);
  for (const node of book.nodes) {
    const prior = before.nodes.find((item) => item.id === node.id),
      inside = frame.nodeIds.includes(node.id);
    assert.deepEqual(node.position, {
      x: prior.position.x + (inside ? 120 : 0),
      y: prior.position.y + (inside ? -80 : 0),
    });
  }
  assert.deepEqual(semantic(book), relations);
  assert.equal(frame.x, before.frames[0].x + 120);
  validateNotebook(book);
});
test('resizing a frame only changes spatial membership; removing it never deletes a node', () => {
  const book = createNotebook('root');
  const child = addNode(book, book.rootId, 'child');
  initializeBoard(book);
  const frame = createFrame(book, [book.rootId]),
    before = semantic(book);
  resizeFrame(book, frame.id, 700, 240);
  assert(frame.nodeIds.includes(child.id));
  resizeFrame(book, frame.id, 288, 212);
  assert(!frame.nodeIds.includes(child.id));
  book.frames = [];
  assert.deepEqual(semantic(book), before);
  validateNotebook(book);
});
test('dragging a card into and out of a frame changes its membership without reparenting', () => {
  const book = createNotebook('root'),
    child = addNode(book, book.rootId, 'child');
  initializeBoard(book);
  const frame = createFrame(book, [book.rootId]);
  moveCards(book, [child.id], -332, 0);
  syncFrameMembership(book);
  assert(frame.nodeIds.includes(child.id));
  moveCards(book, [child.id], 1000, 0);
  syncFrameMembership(book);
  assert(!frame.nodeIds.includes(child.id));
  assert.equal(child.parentId, book.rootId);
});
test('invalid coordinates, colors, sides and dangling frame members are rejected', () => {
  for (const corrupt of [
    (b) => {
      b.nodes[0].position.x = Infinity;
    },
    (b) => {
      b.nodes[0].position.y = '4';
    },
    (b) => {
      b.nodes[0].position = [];
    },
    (b) => {
      b.nodes[1].lineColor = 'url(https://bad)';
    },
    (b) => {
      b.nodes[1].branchSide = '__proto__';
    },
    (b) => {
      b.frames[0].nodeIds.push('missing');
    },
    (b) => {
      b.frames[0].nodeIds.push(b.frames[0].nodeIds[0]);
    },
    (b) => {
      b.frames[0].width = 0;
    },
    (b) => {
      b.frames[0].height = NaN;
    },
    (b) => {
      b.frames[0].title = ' ';
    },
    (b) => {
      b.frames.push(clone(b.frames[0]));
    },
    (b) => {
      b.frames[0].color = 'red; background: url(bad)';
    },
  ]) {
    const { book } = fixture();
    corrupt(book);
    assert.throws(() => validateNotebook(book));
  }
});
test('import rejects both missing enclosed members and existing but outside frame members', () => {
  const { workspace } = fixture(),
    before = clone(workspace);
  for (const corrupt of [
    (b) => {
      b.frames[0].nodeIds.pop();
    },
    (b) => {
      b.frames[0].nodeIds.push(b.rootId);
    },
  ]) {
    const imported = clone(workspace);
    corrupt(imported.notebooks[0]);
    assert.throws(() => importNotebooks(workspace, JSON.stringify(imported)), /分類枠/);
    assert.deepEqual(workspace, before);
  }
});
test('ordinary and AI additions inside an existing frame join before it moves', () => {
  const book = createNotebook('root');
  initializeBoard(book);
  const frame = createFrame(book, [book.rootId]);
  resizeFrame(book, frame.id, 1200, 1000);
  const a = addNode(book, book.rootId, 'ordinary');
  assert(frame.nodeIds.includes(a.id));
  const [p] = stageProposals(book, {
    version: 1,
    notebookId: book.id,
    parentId: book.rootId,
    branches: [{ text: 'AI', note: '' }],
  });
  const b = approveProposal(book, p.id);
  assert(frame.nodeIds.includes(b.id));
  const before = clone([a.position, b.position]);
  moveFrame(book, frame.id, 50, 20);
  assert.deepEqual(a.position, { x: before[0].x + 50, y: before[0].y + 20 });
  assert.deepEqual(b.position, { x: before[1].x + 50, y: before[1].y + 20 });
  validateNotebook(book);
});
test('invalid card and frame movement rejects before mutating any member', () => {
  const { book } = fixture(),
    before = clone(book);
  assert.throws(() =>
    moveCards(
      book,
      book.nodes.map((node) => node.id),
      900000,
      0,
    ),
  );
  assert.deepEqual(book, before);
  assert.throws(() => moveFrame(book, book.frames[0].id, NaN, 0));
  assert.deepEqual(book, before);
  assert.throws(() => setLineColor(book, [book.nodes[1].id], 'bad'));
  assert.deepEqual(book, before);
});
test('board JSON roundtrip remaps frame IDs and membership and retains positions/colors', () => {
  const { workspace, book } = fixture(),
    before = clone(book);
  const [copy] = importNotebooks(workspace, JSON.stringify(workspace));
  assert.deepEqual(workspace.notebooks[0], before);
  assert.notEqual(copy.frames[0].id, book.frames[0].id);
  for (let i = 0; i < book.nodes.length; i++) {
    assert.deepEqual(copy.nodes[i].position, book.nodes[i].position);
    assert.equal(copy.nodes[i].lineColor, book.nodes[i].lineColor);
    assert.equal(
      copy.frames[0].nodeIds.includes(copy.nodes[i].id),
      book.frames[0].nodeIds.includes(book.nodes[i].id),
    );
  }
  assert(copy.frames[0].nodeIds.every((id) => copy.nodes.some((node) => node.id === id)));
  validateWorkspace(workspace);
});
test('deleting a branch cleans all frame references and snapshot restores them', () => {
  const { book } = fixture(),
    before = clone(book),
    frame = book.frames[0],
    target = frame.nodeIds[0];
  deleteBranch(book, target);
  validateNotebook(book);
  assert(!frame.nodeIds.includes(target));
  assert(before.frames[0].nodeIds.includes(target));
  assert(before.nodes.some((node) => node.id === target));
});
test('AI staging is still inert and approval places one new card without repositioning others', () => {
  const { book } = fixture(),
    before = clone(book.nodes);
  const [p] = stageProposals(book, {
    version: 1,
    notebookId: book.id,
    parentId: book.rootId,
    branches: [{ text: 'AI案', note: '' }],
  });
  assert.deepEqual(book.nodes, before);
  const node = approveProposal(book, p.id);
  assert(node.position);
  assert.deepEqual(book.nodes.slice(0, -1), before);
  assert(before.every((prior) => !overlaps(node.position, prior.position)));
  validateNotebook(book);
});
test('connector geometry is finite for all four directions and reversed positions', () => {
  const parent = { position: { x: -100, y: -200 } };
  for (const branchSide of ['right', 'bottom', 'left', 'top']) {
    const result = connector(parent, { position: { x: -500, y: 430 }, branchSide });
    assert(result.startsWith('M'));
    assert(!/NaN|undefined|Infinity/.test(result));
  }
});
test('spatial save/reload preserves geometry and an old disk version survives a quota error', () => {
  const { workspace, book } = fixture(),
    disk = storage(),
    raw = save(disk, workspace, null);
  moveFrame(book, book.frames[0].id, -90, 150);
  const moved = save(disk, workspace, raw);
  assert.deepEqual(load(disk).workspace, workspace);
  book.frames[0].title = '未保存の変更';
  const set = disk.setItem;
  disk.setItem = (key, value) => {
    if (key === KEY) throw new Error('quota');
    set(key, value);
  };
  assert.throws(() => save(disk, workspace, moved));
  assert.equal(disk.getItem(KEY), moved);
  assert.equal(book.frames[0].title, '未保存の変更');
});

// State-machine tests only. These do not emulate real browser hit-testing,
// pointer capture, focus, painting, or touch hardware.
function gestureHarness() {
  const view = Object.create(BoardView.prototype),
    calls = [];
  Object.assign(view, {
    pointers: new Map(),
    book: { nodes: [], frames: [] },
    drawGeometry() {},
    dragFrame: null,
    callbacks: {
      select: (id) => calls.push(['select', id]),
      edit: (id) => calls.push(['edit', id]),
      add: (id, side) => calls.push(['add', id, side]),
      multiple: () => false,
      gesture: (g) => calls.push(['move', g.type]),
      clearFrame() {},
      frame() {},
    },
  });
  const tap = (id, pointerType = 'touch', extra = {}) => {
    view.pointers.set(1, {});
    view.gesture = { pointerId: 1, cardId: id, pointerType, type: 'cards', moved: false, ...extra };
    view.pointerUp({ pointerId: 1, clientX: 100, clientY: 100 });
  };
  return { view, calls, tap };
}
test('two pairs of touch taps on the same parent make two separate branches', () => {
  const { calls, tap } = gestureHarness();
  tap('parent');
  tap('parent');
  tap('parent');
  tap('parent');
  assert.deepEqual(
    calls.filter((call) => call[0] === 'add'),
    [
      ['add', 'parent', 'right'],
      ['add', 'parent', 'right'],
    ],
  );
});
test('mouse double-click and multi-select taps do not create branches', () => {
  const { calls, tap, view } = gestureHarness();
  tap('parent', 'mouse');
  tap('parent', 'mouse');
  view.callbacks.multiple = () => true;
  tap('parent');
  tap('parent');
  assert.equal(calls.filter((call) => call[0] === 'add').length, 0);
});
test('dragging or tapping two different cards does not accidentally double-add', () => {
  const { calls, tap } = gestureHarness();
  tap('a');
  tap('b');
  tap('b', 'touch', { moved: true, ids: ['b'], dx: 80, dy: 50 });
  tap('b');
  assert.equal(calls.filter((call) => call[0] === 'add').length, 0);
  assert.equal(calls.filter((call) => call[0] === 'move').length, 1);
});
test('pinch release consumes remaining touches without producing a card click', () => {
  const { view, calls } = gestureHarness();
  view.pointers.set(1, {});
  view.pointers.set(2, {});
  view.pinch = { scale: 1 };
  view.pointerUp({ pointerId: 1 });
  assert(view.pinch);
  view.pointerUp({ pointerId: 2 });
  assert.equal(view.pinch, null);
  assert.equal(calls.length, 0);
});
