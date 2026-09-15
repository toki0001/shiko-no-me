import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildHTML } from './render-html.mjs';

// Public assets are generated from readable sources, without third-party tools.
const root = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => readFile(path.join(root, file), 'utf8');
const template = await read('src/index.html');
const styles = await Promise.all(
  ['styles.css', 'board.css', 'focus.css'].map((name) => read('dist/' + name)),
);
const html = buildHTML(template, styles, await read('dist/app.mjs'));
await writeFile(path.join(root, 'dist/index.html'), html, 'utf8');
console.log('Built dist/index.html: inline styles + entry module, preloaded dependencies.');
