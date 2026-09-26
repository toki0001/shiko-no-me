import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITS,
  clone,
  createNotebook,
  sampleWorkspace,
  getNode,
  children,
  ancestors,
  subtree,
  visibleNodes,
  addNode,
  updateNode,
  moveNode,
  deleteBranch,
  validateNotebook,
  validateWorkspace,
  parseJSON,
  stageProposals,
  approveProposal,
  dismissProposal,
  buildPrompt,
  importNotebooks,
} from '../dist/model.mjs';
import { KEY, BACKUP_KEY, load, save, decode } from '../dist/storage.mjs';

const fixture = () => {
  const workspace = sampleWorkspace();
  return { workspace, book: workspace.notebooks[0] };
};
const payloadFor = (book) => ({
  version: 1,
  notebookId: book.id,
  parentId: book.rootId,
  branches: [
    { text: '別の視点', note: '理由を書いてみる' },
    { text: '小さく試す', note: '一回で確かめる' },
  ],
});
function storageFixture() {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('representative sample is a valid connected tree with different decision states', () => {
  const { workspace, book } = fixture();
  assert.equal(validateWorkspace(workspace), workspace);
  assert.equal(book.nodes.length, 7);
  assert.equal(subtree(book, book.rootId).length, 7);
  assert.equal(book.nodes.find(node => node.text === 'どんな人と学びたい？').state, 'growing');
  assert.equal(book.nodes.find(node => node.text === '週に一度、30分だけ集まる').state, 'adopted');
});
test('add a child, edit title/note and decision without changing its parent', () => {
  const { book } = fixture(),
    node = addNode(book, book.rootId, '新しい案');
  updateNode(book, node.id, { text: '変更した案', note: '判断理由', state: 'parked' });
  assert.equal(node.parentId, book.rootId);
  assert.equal(node.note, '判断理由');
  assert.equal(node.state, 'parked');
  validateNotebook(book);
});
test('root title is the notebook title (no duplicated stale title field)', () => {
  const { book } = fixture();
  updateNode(book, book.rootId, { text: '新しいテーマ' });
  assert.equal(getNode(book, book.rootId).text, '新しいテーマ');
});
test('blank and overlong titles are rejected before addition', () => {
  const { book } = fixture(),
    before = clone(book);
  for (const title of ['', '   ', 'a'.repeat(LIMITS.title + 1)])
    assert.throws(() => addNode(book, book.rootId, title));
  assert.deepEqual(book, before);
});
test('source becomes mixed after editing an AI proposal', () => {
  const { book } = fixture(),
    node = addNode(book, book.rootId, 'AI案', '', 'ai');
  updateNode(book, node.id, { note: '自分の判断を追記' });
  assert.equal(node.source, 'mixed');
});
test('move branches up/down, indent/outdent, preserving subtree and valid order', () => {
  const book = createNotebook('テーマ'),
    a = addNode(book, book.rootId, 'A'),
    b = addNode(book, book.rootId, 'B'),
    c = addNode(book, b.id, 'C');
  moveNode(book, b.id, 'up');
  assert.equal(children(book, book.rootId)[0].id, b.id);
  moveNode(book, b.id, 'down');
  assert.equal(children(book, book.rootId)[1].id, b.id);
  moveNode(book, b.id, 'indent');
  assert.equal(b.parentId, a.id);
  assert.equal(c.parentId, b.id);
  moveNode(book, b.id, 'outdent');
  assert.equal(b.parentId, book.rootId);
  assert.equal(children(book, book.rootId)[1].id, b.id);
  validateNotebook(book);
});
test('cannot move root or outdent beyond root', () => {
  const { book } = fixture(),
    before = clone(book);
  assert.throws(() => moveNode(book, book.rootId, 'indent'));
  assert.throws(() => moveNode(book, children(book, book.rootId)[0].id, 'outdent'));
  assert.deepEqual(book, before);
});
test('collapsing a branch hides only descendants; focused subtree starts at zero', () => {
  const { book } = fixture(),
    target = children(book, book.rootId)[0];
  const rows = visibleNodes(book, new Set([target.id]));
  assert.equal(rows.length, 6);
  assert(rows.some((row) => row.node.id === target.id));
  const focused = visibleNodes(book, new Set(), target.id);
  assert.equal(focused[0].depth, 0);
  assert.equal(focused.length, 2);
});
test('reject duplicate ids, disconnected nodes, cycles and two roots', () => {
  for (const corrupt of [
    (b) => {
      b.nodes[1].id = b.rootId;
    },
    (b) => {
      b.nodes[1].parentId = 'missing';
    },
    (b) => {
      b.nodes[1].parentId = b.nodes[2].id;
    },
    (b) => {
      b.nodes[1].parentId = null;
    },
  ]) {
    const { book } = fixture();
    corrupt(book);
    assert.throws(() => validateNotebook(book));
  }
});
test('node and depth limits reject excess before mutation', () => {
  const book = createNotebook('root');
  let parent = book.rootId;
  for (let i = 1; i < LIMITS.depth; i++) parent = addNode(book, parent, `depth${i}`).id;
  assert.throws(() => addNode(book, parent, 'too deep'));
  validateNotebook(book);
  const broad = createNotebook('root');
  for (let i = 1; i < LIMITS.nodes; i++) addNode(broad, broad.rootId, `n${i}`);
  assert.throws(() => addNode(broad, broad.rootId, 'too many'));
});
test('staging proposals leaves the tree untouched', () => {
  const { book } = fixture(),
    before = clone(book.nodes);
  const staged = stageProposals(book, payloadFor(book));
  assert.equal(staged.length, 2);
  assert.deepEqual(book.nodes, before);
  assert(staged.every((p) => p.status === 'pending'));
});
test('approval adds only the selected proposal and cannot be repeated', () => {
  const { book } = fixture(),
    [a, b] = stageProposals(book, payloadFor(book)),
    before = book.nodes.length;
  const node = approveProposal(book, a.id);
  assert.equal(book.nodes.length, before + 1);
  assert.equal(node.source, 'ai');
  assert.equal(a.status, 'accepted');
  assert.equal(b.status, 'pending');
  assert.throws(() => approveProposal(book, a.id));
  validateNotebook(book);
});
test('dismissal never modifies the tree and can be undone with a snapshot', () => {
  const { book } = fixture(),
    [p] = stageProposals(book, payloadFor(book)),
    before = clone(book);
  dismissProposal(book, p.id);
  assert.deepEqual(book.nodes, before.nodes);
  assert.equal(p.status, 'dismissed');
  assert.equal(before.proposals[0].status, 'pending');
});
test('duplicate proposal payloads are idempotent, including accepted proposals', () => {
  const { book } = fixture(),
    payload = payloadFor(book),
    [p] = stageProposals(book, payload);
  approveProposal(book, p.id);
  assert.equal(stageProposals(book, payload).length, 0);
});
test('foreign notebooks, missing parents and malformed proposal batches are rejected atomically', () => {
  const { book } = fixture(),
    before = clone(book);
  for (const change of [
    (p) => {
      p.notebookId = 'wrong';
    },
    (p) => {
      p.parentId = 'missing';
    },
    (p) => {
      p.branches = [];
    },
    (p) => {
      p.branches[1].text = '';
    },
    (p) => {
      p.branches[1].note = 'x'.repeat(4001);
    },
    (p) => {
      p.approve = true;
    },
    (p) => {
      p.branches[0].source = 'human';
    },
  ]) {
    const payload = payloadFor(book);
    change(payload);
    assert.throws(() => stageProposals(book, payload));
    assert.deepEqual(book, before);
  }
});
test('deleting a subtree orphans its pending proposals and does not permit approval', () => {
  const { book } = fixture(),
    target = children(book, book.rootId)[0],
    payload = payloadFor(book);
  payload.parentId = target.id;
  const [p] = stageProposals(book, payload);
  const before = book.nodes.length;
  deleteBranch(book, target.id);
  assert.equal(book.nodes.length, before - 2);
  assert.equal(p.status, 'orphaned');
  assert.throws(() => approveProposal(book, p.id));
  validateNotebook(book);
});
test('scoped AI prompt excludes unselected sibling notes', () => {
  const { book } = fixture(),
    selected = children(book, book.rootId)[0],
    other = children(book, book.rootId)[1];
  other.note = 'DO_NOT_SEND_SIBLING_MEMO';
  const prompt = buildPrompt(book, selected.id, '見落としは？');
  assert(!prompt.includes(other.note));
  assert(prompt.includes(selected.id));
  assert(prompt.includes(book.id));
  assert(buildPrompt(book, selected.id, '見落としは？', 'notebook').includes(other.note));
});
test('JSON code fence accepted, prose/invalid/oversize JSON rejected', () => {
  assert.deepEqual(parseJSON('```json\n{"version":1}\n```'), { version: 1 });
  assert.throws(() => parseJSON('Here is your JSON: {}'));
  assert.throws(() => parseJSON('{'));
  assert.throws(() => parseJSON('x'.repeat(20), 10));
});
test('file round trip appends books without replacing existing data and remaps IDs', () => {
  const { workspace, book } = fixture(),
    original = clone(book),
    serialized = JSON.stringify(workspace);
  const [copy] = importNotebooks(workspace, serialized);
  assert.equal(workspace.notebooks.length, 2);
  assert.deepEqual(workspace.notebooks[0], original);
  assert.notEqual(copy.id, original.id);
  assert.notEqual(copy.rootId, original.rootId);
  assert.equal(copy.nodes.length, original.nodes.length);
  validateWorkspace(workspace);
});
test('import retains only unprocessed proposals and remaps their parents', () => {
  const { workspace, book } = fixture(),
    [p] = stageProposals(book, payloadFor(book));
  approveProposal(book, p.id);
  const [copy] = importNotebooks(workspace, JSON.stringify(workspace));
  assert.equal(copy.proposals.length, 1);
  assert.equal(copy.proposals[0].parentId, copy.rootId);
  validateNotebook(copy);
});
test('original MCP tree JSON imports without MCP dependencies or shared-file writes', () => {
  const { workspace, book } = fixture();
  const [copy] = importNotebooks(workspace, JSON.stringify({ title: 'old', nodes: book.nodes }));
  assert.equal(copy.nodes[0].text, book.nodes[0].text);
  validateNotebook(copy);
});
test('invalid import leaves all current notebooks unchanged', () => {
  const { workspace } = fixture(),
    before = clone(workspace);
  assert.throws(() => importNotebooks(workspace, '{"nodes":[]}'));
  const valid = clone(workspace.notebooks[0]);
  const invalid = clone(valid);
  invalid.id = 'other-notebook';
  invalid.nodes[1].parentId = 'missing-parent';
  assert.throws(() =>
    importNotebooks(
      workspace,
      JSON.stringify({ version: 1, activeId: valid.id, notebooks: [valid, invalid] }),
    ),
  );
  assert.deepEqual(workspace, before);
});
test('new browser saves and reloads exact notebook contents with revision', () => {
  const storage = storageFixture(),
    state = load(storage);
  assert.equal(state.raw, null);
  assert.equal(state.blocked, false);
  const raw = save(storage, state.workspace, null);
  assert.equal(load(storage).raw, raw);
  assert.deepEqual(decode(raw).workspace, state.workspace);
});
test('saving writes a previous-version backup', () => {
  const storage = storageFixture(),
    { workspace } = fixture(),
    first = save(storage, workspace, null);
  workspace.notebooks[0].nodes[0].note = 'new';
  save(storage, workspace, first);
  assert.equal(storage.getItem(BACKUP_KEY), first);
});
test('stale-tab saves are rejected without overwriting another tab', () => {
  const storage = storageFixture(),
    { workspace } = fixture(),
    first = save(storage, workspace, null),
    second = save(storage, workspace, first);
  assert.throws(() => save(storage, workspace, first), /別のタブ/);
  assert.equal(storage.getItem(KEY), second);
});
test('quota failure preserves old saved version and in-memory user input', () => {
  const storage = storageFixture(),
    { workspace } = fixture(),
    first = save(storage, workspace, null),
    originalSet = storage.setItem;
  workspace.notebooks[0].nodes[0].note = 'valuable draft';
  storage.setItem = (key, value) => {
    if (key === KEY) throw new Error('quota');
    originalSet(key, value);
  };
  assert.throws(() => save(storage, workspace, first), /保存できません/);
  assert.equal(storage.getItem(KEY), first);
  assert.equal(workspace.notebooks[0].nodes[0].note, 'valuable draft');
});
test('unreadable storage is never treated as an empty target for a new save', () => {
  const values = new Map(),
    storage = {
      getItem() {
        throw new Error('denied');
      },
      setItem(key, value) {
        values.set(key, value);
      },
    },
    recovered = load(storage);
  assert.equal(recovered.blocked, true);
  assert.throws(() => save(storage, recovered.workspace, recovered.raw), /保存できません/);
  assert.equal(values.size, 0);
});
test('backup write failure preserves the current save and in-memory edit', () => {
  const storage = storageFixture(),
    { workspace } = fixture(),
    first = save(storage, workspace, null);
  workspace.notebooks[0].nodes[0].note = 'valuable edit';
  storage.setItem = (key, value) => {
    if (key === BACKUP_KEY) throw new Error('quota');
    storage.values.set(key, value);
  };
  assert.throws(() => save(storage, workspace, first), /保存できません/);
  assert.equal(storage.getItem(KEY), first);
  assert.equal(workspace.notebooks[0].nodes[0].note, 'valuable edit');
});
test('corrupt data is never silently overwritten; a valid backup can be displayed', () => {
  const storage = storageFixture(),
    { workspace } = fixture(),
    first = save(storage, workspace, null);
  save(storage, workspace, first);
  storage.setItem(KEY, 'corrupt');
  const restored = load(storage);
  assert.equal(restored.blocked, true);
  assert.equal(restored.recovery, true);
  assert.equal(storage.getItem(KEY), 'corrupt');
  assert.deepEqual(restored.workspace, workspace);
  assert.throws(() => save(storage, restored.workspace, restored.raw), /保存できません/);
  assert.equal(storage.getItem(KEY), 'corrupt');
  assert.equal(storage.getItem(BACKUP_KEY), first);
});
test('unavailable or entirely corrupt storage still provides an exportable workspace', () => {
  for (const storage of [
    {
      getItem() {
        throw new Error('denied');
      },
    },
    {
      getItem() {
        return '{bad';
      },
    },
  ]) {
    const result = load(storage);
    assert.equal(result.blocked, true);
    validateWorkspace(result.workspace);
  }
});
