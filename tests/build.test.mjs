import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildHTML } from '../scripts/render-html.mjs';

const read = (file) => readFile(new URL('../' + file, import.meta.url), 'utf8');

test('shipped HTML exactly matches readable sources and keeps CSS cascade order', async () => {
  const template = await read('src/index.html');
  const styles = await Promise.all(
    ['styles.css', 'board.css', 'focus.css', 'ai.css', 'goal.css'].map((name) => read('dist/' + name)),
  );
  const app = await read('dist/app.mjs');
  assert.equal(await read('dist/index.html'), buildHTML(template, styles, app));
  const html = buildHTML(template, styles, app);
  assert(!html.includes('rel="stylesheet"'));
  assert(!html.includes('src="./app.mjs"'));
  for (const match of app.matchAll(/from ['"]([^'"]+)['"]/g)) {
    assert(html.includes(`rel="modulepreload" href="${match[1]}"`), match[1]);
  }
});

test('inlining preserves replacement characters and normalizes checkout newlines', () => {
  const template = '<!-- build:styles -->\r\n<!-- build:app -->';
  const html = buildHTML(
    template,
    ['a { color: red }', 'a { color: blue }'],
    'const value = "$&";',
  );
  assert(html.includes('const value = "$&";'));
  assert(html.indexOf('red') < html.indexOf('blue'));
  assert(!html.includes('\r'));
});

test('build rejects missing markers, duplicates and closing inline tags', () => {
  const template = '<!-- build:styles --><!-- build:app -->';
  assert.throws(() => buildHTML('', [], ''), /marker/);
  assert.throws(() => buildHTML(template + template, [], ''), /marker/);
  assert.throws(() => buildHTML(template, ['</style>'], ''), /closing HTML tag/);
  assert.throws(() => buildHTML(template, [], '</script>'), /closing HTML tag/);
});
