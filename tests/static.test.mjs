import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));

test('all local HTML assets and module imports exist and are relative', async () => {
  const html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)) {
    assert(match[1].startsWith('./'), `not a relative asset: ${match[1]}`); await access(path.join(root, 'dist', match[1]));
  }
  for (const name of await readdir(path.join(root, 'dist'))) {
    if (!name.endsWith('.mjs')) continue;
    const code = await readFile(path.join(root, 'dist', name), 'utf8');
    for (const match of code.matchAll(/from ['"]([^'"]+)['"]/g)) { assert(match[1].startsWith('./')); await access(path.join(root, 'dist', match[1])); }
  }
});
test('contest runtime has no external dependencies, API fetches, script CDN or unsafe HTML insertion', async () => {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  assert.equal(Object.keys(pkg.dependencies ?? {}).length, 0); assert.equal(Object.keys(pkg.devDependencies ?? {}).length, 0);
  for (const name of ['app.mjs', 'model.mjs', 'storage.mjs']) {
    const code = await readFile(path.join(root, 'dist', name), 'utf8');
    assert(!/\bfetch\s*\(|innerHTML\s*=|eval\s*\(|new Function\s*\(/.test(code), name);
  }
});
test('HTML has unique IDs, labels, viewport and manual AI fallback', async () => {
  const html = await readFile(path.join(root, 'dist/index.html'), 'utf8'), ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length); assert(html.includes('viewport-fit=cover')); assert(!/user-scalable=no|maximum-scale/.test(html));
  for (const match of html.matchAll(/\bfor="([^"]+)"/g)) assert(ids.includes(match[1]));
  for (const id of ['copy-prompt', 'read-proposals', 'export-all', 'undo']) assert(ids.includes(id));
});
