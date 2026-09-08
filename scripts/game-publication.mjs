import { readFile, lstat, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { sha256 } from './landing-publication.mjs';

// Version directories contain built runtime files only, never drafts, saves or source.
export function assertGameFile(file) {
  if (typeof file !== 'string' || !(file === 'index.html' || file === 'CREDITS.txt' ||
      /^assets\/[A-Za-z0-9][A-Za-z0-9._-]*\.(?:js|css|svg|mp3)$/.test(file) ||
      /^licenses\/[A-Za-z0-9][A-Za-z0-9._-]*\.txt$/.test(file))) {
    throw new Error(`Invalid game publication file: ${file}`);
  }
  return file;
}

export function validateGameManifest(manifest, catalog, packageInfo, prefix) {
  if (!/^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/.test(catalog?.landingPrefix || '') ||
      catalog.landingPrefix.split('/').some((part) => /^v\d/i.test(part))) {
    throw new Error('Invalid fixed entry prefix');
  }
  if (!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(packageInfo?.version || '') ||
      manifest?.version !== packageInfo.version) {
    throw new Error('Build version does not match package; rebuild before publishing');
  }
  if (prefix !== `${catalog.landingPrefix}/v${manifest.version}`) {
    throw new Error('Game publication must match the fixed entry catalog');
  }
  if (!manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files) ||
      !Object.hasOwn(manifest.files, 'index.html')) throw new Error('Game manifest requires index.html');
  let total = 0;
  for (const [file, expected] of Object.entries(manifest.files)) {
    assertGameFile(file);
    if (!Number.isSafeInteger(expected?.bytes) || expected.bytes <= 0 ||
        !/^[a-f0-9]{64}$/.test(expected?.sha256 || '')) {
      throw new Error(`Invalid game manifest metadata: ${file}`);
    }
    total += expected.bytes;
  }
  if (!Number.isSafeInteger(manifest.bytes) || manifest.bytes !== total) {
    throw new Error('Game manifest byte total does not match its files');
  }
}

export async function readGameFiles(directory, manifest) {
  if (!(await lstat(directory)).isDirectory()) throw new Error('Build directory must be a regular directory');
  const base = await realpath(directory), files = [];
  for (const [file, expected] of Object.entries(manifest.files)) {
    assertGameFile(file);
    const parts = file.split('/');
    let absolute = base;
    for (const [index, part] of parts.entries()) {
      absolute = path.join(absolute, part);
      const entry = await lstat(absolute);
      if (entry.isSymbolicLink() || (index === parts.length - 1 ? !entry.isFile() : !entry.isDirectory())) {
        throw new Error(`Game file is a symlink or not a regular file: ${file}`);
      }
    }
    if (await realpath(absolute) !== absolute) throw new Error(`Game file leaves the build directory: ${file}`);
    const bytes = await readFile(absolute);
    if (bytes.length !== expected.bytes || sha256(bytes) !== expected.sha256) {
      throw new Error(`Build changed: ${file}`);
    }
    const entry = { path: file, mode: '100644', type: 'blob' };
    if (file.endsWith('.mp3')) {
      // Git's blob digest also lets us verify the binary upload before creating its tree.
      const blobSha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
      files.push({ ...entry, content: bytes.toString('base64'), encoding: 'base64', blobSha });
    } else {
      let content;
      try { content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
      catch { throw new Error(`Game text asset is not UTF-8: ${file}`); }
      if (content.includes('\0')) throw new Error(`Binary game text asset rejected: ${file}`);
      files.push({ ...entry, content });
    }
  }
  return files;
}

// Call this before the first POST, even if a binary upload is otherwise ready.
export function assertGameReleaseAvailable(prefix, existing) {
  if (existing?.truncated || !Array.isArray(existing?.tree)) {
    throw new Error('Remote tree is incomplete; cannot verify publication boundaries');
  }
  const ancestors = prefix.split('/').slice(0, -1).map((_, index, parts) => parts.slice(0, index + 1).join('/'));
  if (existing.tree.some((entry) => entry.path === prefix || entry.path.startsWith(prefix + '/'))) {
    throw new Error('Immutable prototype path already exists');
  }
  if (existing.tree.some((entry) => ancestors.includes(entry.path) && (entry.type !== 'tree' || entry.mode !== '040000'))) {
    throw new Error('Game publication prefix conflicts with an existing file');
  }
}

// Local files must all be validated, and remote identity/head/path checks must pass first.
export function createGameTree(files, prefix, repository, api) {
  return files.map(({ path: file, mode, type, content, encoding, blobSha }) => {
    if (!encoding) return { path: `${prefix}/${file}`, mode, type, content };
    const blob = api(`repos/${repository}/git/blobs`, 'POST', { content, encoding });
    if (blob.sha !== blobSha) throw new Error(`Uploaded game blob does not match the build: ${file}`);
    return { path: `${prefix}/${file}`, mode, type, sha: blob.sha };
  });
}
