import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));

test('all local HTML assets and module imports exist and are relative', async () => {
  const html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)) {
    if (match[1] === 'https://github.com/toki0001/shiko-no-me/issues/new') continue; // User-initiated feedback link, never a loaded dependency.
    assert(match[1].startsWith('./'), `not a relative asset: ${match[1]}`);
    // Navigation links may contain a query; only the pathname is a disk asset.
    await access(path.join(root, 'dist', match[1].split(/[?#]/)[0]));
  }
  for (const name of await readdir(path.join(root, 'dist'))) {
    if (!name.endsWith('.mjs')) continue;
    const code = await readFile(path.join(root, 'dist', name), 'utf8');
    for (const match of code.matchAll(/from ['"]([^'"]+)['"]/g)) {
      assert(match[1].startsWith('./'));
      await access(path.join(root, 'dist', match[1]));
    }
  }
});
test('contest runtime has no external dependencies, API fetches, script CDN or unsafe HTML insertion', async () => {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  assert.equal(Object.keys(pkg.dependencies ?? {}).length, 0);
  assert.equal(Object.keys(pkg.devDependencies ?? {}).length, 0);
  for (const name of ['app.mjs', 'model.mjs', 'storage.mjs', 'board-model.mjs', 'board-view.mjs']) {
    const code = await readFile(path.join(root, 'dist', name), 'utf8');
    assert(!/\bfetch\s*\(|innerHTML\s*=|eval\s*\(|new Function\s*\(/.test(code), name);
  }
});
test('HTML has unique IDs, labels, viewport and manual AI fallback', async () => {
  const html = await readFile(path.join(root, 'dist/index.html'), 'utf8'),
    ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert(html.includes('viewport-fit=cover'));
  assert(!/user-scalable=no|maximum-scale/.test(html));
  for (const match of html.matchAll(/\bfor="([^"]+)"/g)) assert(ids.includes(match[1]));
  for (const id of ['copy-prompt', 'read-proposals', 'export-all', 'undo'])
    assert(ids.includes(id));
});

test('every native dialog has an accessible name linked to an existing heading', async () => {
  const html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
  const dialogs = [...html.matchAll(/<dialog\b([^>]+)>/g)];
  assert.equal(dialogs.length, 7);
  for (const dialog of dialogs) {
    const label = dialog[1].match(/aria-labelledby="([^"]+)"/);
    assert(label, dialog[0]);
    assert(html.includes(`id="${label[1]}"`));
  }
});

test('all direct application ID references have a matching DOM element', async () => {
  const html = await readFile(path.join(root, 'dist/index.html'), 'utf8'),
    code = await readFile(path.join(root, 'dist/app.mjs'), 'utf8');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  for (const match of code.matchAll(/\$\('([^']+)'\)/g)) assert(ids.has(match[1]), match[1]);
});

test('history stays on the working surface and notebook navigation ends the top bar', async () => {
  const html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
  const header = html.match(/<header class="topbar">([\s\S]*?)<\/header>/)[1];
  assert(!/id="(?:undo|redo)"/.test(header));
  assert(header.indexOf('id="open-ai"') < header.indexOf('id="open-sidebar"'));
  assert(header.includes('aria-controls="sidebar" aria-expanded="false"'));
  const history = html.indexOf('class="history-controls"');
  assert(history > html.indexOf('id="board"'));
  assert(history < html.indexOf('id="board-navigation"'));
  assert(html.includes('id="add-child"'));
  assert(!html.includes('id="add-sibling"'));
});
