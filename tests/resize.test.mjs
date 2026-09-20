import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD, CORNERS, cardRect, resizedRect, resizeCard, resizeFrame, createFrame,
  initializeBoard, validateBoard, boundsOf, connector, alignmentContext, freePosition, overlaps } from '../dist/board-model.mjs';
import { createNotebook, addNode, clone, importNotebooks } from '../dist/model.mjs';
import { BoardView } from '../dist/board-view.mjs';
import { save, load } from '../dist/storage.mjs';

test('each corner fixes its opposite point at normal, minimum and maximum sizes', () => {
  for (const corner of CORNERS) {
    const start = { x: 50, y: 60, width: 400, height: 300 };
    const west = corner.includes('w'), north = corner.includes('n');
    for (const amount of [70, -10000, 10000]) {
      const rect = resizedRect(start, corner, amount * (west ? -1 : 1), amount * (north ? -1 : 1));
      assert.equal(west ? rect.x + rect.width : rect.x, west ? 450 : 50);
      assert.equal(north ? rect.y + rect.height : rect.y, north ? 360 : 60);
      assert(rect.width >= 160 && rect.width <= 2000);
      assert(rect.height >= 96 && rect.height <= 2000);
    }
  }
  assert.throws(() => resizedRect({ x: 0, y: 0, ...CARD }, 'se', NaN, 10));
  assert.throws(() => resizedRect({ x: 0, y: 0, ...CARD }, 'unknown', 1, 1));
});

test('frame resizing from every corner leaves its cards still and updates membership', () => {
  for (const corner of CORNERS) {
    const book = initializeBoard(createNotebook('root'));
    const frame = createFrame(book, [book.rootId]);
    const before = clone(book.nodes), rect = clone(frame);
    resizeFrame(book, frame.id, frame.width + 100, frame.height + 80, corner);
    assert.deepEqual(book.nodes, before);
    assert.equal(corner.includes('w') ? frame.x + frame.width : frame.x,
      corner.includes('w') ? rect.x + rect.width : rect.x);
    assert.deepEqual(frame.nodeIds, [book.rootId]);
    validateBoard(book);
  }
});

test('resized cards change containment, connectors, bounds, guides and placement without changing thoughts', () => {
  const book = initializeBoard(createNotebook('root'));
  const root = book.nodes[0], frame = createFrame(book, [root.id]);
  const original = clone(root);
  resizeCard(book, root.id, 600, 320);
  assert.deepEqual(frame.nodeIds, []);
  const {size, ...rest} = root;
  assert.deepEqual(rest, original);
  assert.deepEqual(boundsOf([root]), { ...root.position, width: 600, height: 320 });
  const child = addNode(book, root.id, 'child');
  assert(!overlaps(cardRect(root), cardRect(child)));
  assert(child.position.x >= root.position.x + 600 + 108);
  assert.match(connector(root, child), /^M600,160 /);
  const context = alignmentContext(book, { type: 'cards', ids: [child.id] });
  assert.equal(context.targets[0].width, 600);
  for (const side of ['right', 'bottom', 'left', 'top']) {
    const point = freePosition(book, root.id, side);
    assert(!book.nodes.some(n => overlaps(point, cardRect(n))));
  }
  resizeCard(book, root.id, CARD.width, CARD.height);
  assert.deepEqual(frame.nodeIds, [root.id]);
  validateBoard(book);
});

test('custom dimensions survive storage and JSON copying; malformed dimensions are rejected', async () => {
  const book = initializeBoard(createNotebook('root'));
  resizeCard(book, book.rootId, 500, 250, 'nw');
  const workspace = { version: 1, activeId: book.id, notebooks: [book] };
  const data = new Map();
  const storage = { getItem:k=>data.get(k)??null, setItem:(k,v)=>data.set(k,v) };
  save(storage, workspace, null);
  assert.deepEqual(load(storage).workspace.notebooks[0].nodes[0].size, { width: 500, height: 250 });
  const [copy] = importNotebooks(workspace, JSON.stringify(workspace));
  assert.deepEqual(copy.nodes[0].size, book.nodes[0].size);
  assert.deepEqual(copy.nodes[0].position, book.nodes[0].position);
  for (const size of [null, [], {width:159,height:96}, {width:224,height:95}, {width:2001,height:116}, {width:'224',height:116}, {width:Infinity,height:116}]) {
    const invalid = clone(book); invalid.nodes[0].size = size;
    assert.throws(() => validateBoard(invalid));
  }
});

test('resize release uses final coordinates at zoom, commits once, and cancel restores preview only', () => {
  for (const type of ['resize', 'card-resize']) {
    const book = initializeBoard(createNotebook('root'));
    const frame = createFrame(book, [book.rootId]);
    const commits = [], view = Object.create(BoardView.prototype);
    const initial = type === 'resize' ? frame : cardRect(book.nodes[0]);
    const g = { type, corner:'nw', cardId:book.rootId, frameId:type==='resize'?frame.id:undefined,
      pointerId:1, moved:true, x:100, y:100, view:{scale:0.5}, dx:0, dy:0 };
    Object.assign(view, {book, pointers:new Map([[1,{}]]), gesture:g,
      drawGeometry(){}, callbacks:{gesture:value=>commits.push(value)} });
    view.pointerUp({pointerId:1,clientX:80,clientY:70});
    assert.equal(commits.length,1);
    assert.equal(commits[0].width, initial.width+40);
    assert.equal(commits[0].height, initial.height+60);
    view.gesture = g;
    view.cancelGesture();
    assert.equal(commits.length,1);
    assert.equal(view.gesture,null);
    assert.equal(view.pointers.size,0);
  }
});
