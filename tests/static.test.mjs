import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));

test('all local HTML assets and module imports exist and are relative', async () => {
  const html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
  const outbound = new Set([
    'https://chatgpt.com/',
    'https://gemini.google.com/app',
    'https://claude.ai/new',
    'https://harada-educate.jp/archives/gro_with_news/2048/',
    'https://github.com/toki0001/shiko-no-me/issues/new',
  ]);
  for (const tag of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) {
    for (const attr of tag[2].matchAll(/\b(src|href)="([^"]+)"/gi)) {
      const [, name, value] = attr;
      if (name.toLowerCase() === 'href' && value.startsWith('#')) continue;
      if (/^https?:\/\//i.test(value)) {
        assert.equal(tag[1].toLowerCase(), 'a', `external ${name} must be a user-initiated link: ${value}`);
        assert.equal(name.toLowerCase(), 'href', `external ${name} must not load as an asset: ${value}`);
        assert(outbound.has(value), `unapproved outbound link: ${value}`);
        assert(/\btarget="_blank"/.test(tag[2]), `outbound link must open separately: ${value}`);
        const rel = tag[2].match(/\brel="([^"]+)"/)?.[1].split(/\s+/) ?? [];
        assert(rel.includes('noopener') && rel.includes('noreferrer'), `outbound link must protect its opener: ${value}`);
        continue;
      }
      assert(value.startsWith('./'), `not a relative asset: ${value}`);
      // Navigation links may contain a query; only the pathname is a disk asset.
      await access(path.join(root, 'dist', value.split(/[?#]/)[0]));
    }
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
  for (const name of ['app.mjs', 'model.mjs', 'storage.mjs', 'board-model.mjs', 'board-view.mjs', 'ai-transfer.mjs', 'goal-story.mjs']) {
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
  for (const id of ['copy-prompt', 'copy-format-prompt', 'read-proposals', 'export-all', 'undo'])
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
