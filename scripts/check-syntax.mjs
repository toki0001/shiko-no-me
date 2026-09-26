import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { extname, join } from 'node:path';

const directories = ['scripts', 'dist', 'tests'];
const files = [
  'server.mjs',
  ...directories.flatMap((directory) =>
    readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && extname(entry.name) === '.mjs')
      .map((entry) => join(directory, entry.name)),
  ),
];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    process.exitCode = result.status ?? 1;
    break;
  }
}

if (!process.exitCode) console.log(`JavaScript syntax OK (${files.length} files)`);
