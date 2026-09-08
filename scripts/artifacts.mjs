import { readFile, writeFile, readdir, copyFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url)),
  require = createRequire(import.meta.url);
await mkdir(path.join(root, 'dist/licenses'), { recursive: true });
const packages = {
  'THREE-MIT.txt': ['three', 'LICENSE'],
  'RAPIER-APACHE-2.0.txt': ['@dimforge/rapier3d-compat', 'LICENSE'],
};
for (const [target, [name, license]] of Object.entries(packages)) {
  let directory = path.dirname(require.resolve(name));
  while (true) {
    try {
      await copyFile(path.join(directory, license), path.join(root, 'dist/licenses', target));
      break;
    } catch {
      const next = path.dirname(directory);
      if (directory === next) throw new Error(`License not found: ${name}`);
      directory = next;
    }
  }
}
await copyFile(path.join(root, 'CREDITS.txt'), path.join(root, 'dist/CREDITS.txt'));
const files = {};
async function visit(directory, relative = '') {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const name = path.posix.join(relative, entry.name),
      absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await visit(absolute, name);
    else {
      const bytes = await readFile(absolute);
      files[name] = {
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      };
    }
  }
}
await visit(path.join(root, 'dist'));
const { version } = JSON.parse(await readFile(path.join(root, 'package.json')));
await mkdir(path.join(root, 'qa'), { recursive: true });
await writeFile(
  path.join(root, 'qa/build-manifest.json'),
  JSON.stringify(
    { version, files, bytes: Object.values(files).reduce((sum, file) => sum + file.bytes, 0) },
    null,
    2,
  ) + '\n',
);
console.log(
  `Manifest: ${Object.keys(files).length} files, ${Object.values(files).reduce((sum, file) => sum + file.bytes, 0)} bytes`,
);
