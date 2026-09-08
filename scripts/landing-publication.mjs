import { readFile, lstat, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const safePrefix = (value) =>
  typeof value === 'string' && /^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/.test(value) &&
  !value.split('/').some((part) => /^v\d/i.test(part));

// The stable entry owns one document and its own assets, never game releases or source files.
export function assertLandingFile(file) {
  if (typeof file !== 'string' ||
      !(file === 'index.html' || /^assets\/[A-Za-z0-9][A-Za-z0-9._-]*\.(?:css|js|svg)$/.test(file))) {
    throw new Error(`Invalid landing publication file: ${file}`);
  }
  return file;
}

export function validateLandingManifest(manifest, catalog, packageInfo) {
  if (!safePrefix(catalog?.landingPrefix)) throw new Error('Invalid landing publication prefix');
  if (!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(packageInfo?.version || '') ||
      manifest?.version !== packageInfo.version) {
    throw new Error('Landing build version does not match package; rebuild before publishing');
  }
  const release = `${catalog.landingPrefix}/v${packageInfo.version}`;
  if (catalog.release !== release || manifest.release !== release) {
    throw new Error('Landing release must match the configured immutable game version');
  }
  if (!manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files) ||
      !Object.hasOwn(manifest.files, 'index.html')) throw new Error('Landing manifest requires index.html');
  let total = 0;
  for (const [file, expected] of Object.entries(manifest.files)) {
    assertLandingFile(file);
    if (!Number.isSafeInteger(expected?.bytes) || expected.bytes <= 0 ||
        !/^[a-f0-9]{64}$/.test(expected?.sha256 || '')) {
      throw new Error(`Invalid landing manifest metadata: ${file}`);
    }
    total += expected.bytes;
  }
  if (!Number.isSafeInteger(manifest.bytes) || manifest.bytes !== total) {
    throw new Error('Landing manifest byte total does not match its files');
  }
  return { prefix: catalog.landingPrefix, release };
}

export function validateHosting(hosting) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(hosting?.repository || '') ||
      !Number.isSafeInteger(hosting.repositoryId) || hosting.repositoryId <= 0 ||
      !/^[a-f0-9]{40}$/.test(hosting.commit || '')) throw new Error('Invalid hosting receipt');
  const url = new URL(hosting.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      !url.pathname.endsWith('/')) throw new Error('Hosting URL must be an HTTPS directory without credentials');
  return url;
}

export async function readLandingFiles(directory, manifest) {
  const base = await realpath(directory);
  const result = [];
  for (const [file, expected] of Object.entries(manifest.files)) {
    assertLandingFile(file);
    const absolute = path.join(base, file);
    const actualPath = await realpath(absolute);
    if (!actualPath.startsWith(base + path.sep) || !(await lstat(absolute)).isFile()) {
      throw new Error(`Landing file leaves the build directory or is not a regular file: ${file}`);
    }
    const bytes = await readFile(absolute);
    if (bytes.length !== expected.bytes || sha256(bytes) !== expected.sha256) {
      throw new Error(`Landing build changed: ${file}`);
    }
    let content;
    try { content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
    catch { throw new Error(`Landing publication only supports UTF-8 text: ${file}`); }
    if (content.includes('\0')) throw new Error(`Binary landing asset rejected: ${file}`);
    result.push({ path: file, mode: '100644', type: 'blob', content });
  }
  return result;
}

// Confirm a target is a complete built game before a fixed entry can point players to it.
export function validateReleaseTree(release, entries, html) {
  const files = new Map(entries.filter((entry) => entry.type === 'blob').map((entry) => [entry.path, entry]));
  if (!files.has(`${release}/index.html`) || !/<html[\s>]/i.test(html)) {
    throw new Error('Configured game release has no valid HTML entry');
  }
  const tags = [...html.matchAll(/<(?:script|link)\b[^>]*>/gi)];
  let scripts = 0;
  for (const [tag] of tags) {
    const attribute = /^<script\b/i.test(tag) ? 'src' : 'href';
    const match = tag.match(new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`, 'i'));
    if (!match) continue;
    const reference = match[1];
    const base = new URL(`https://release.invalid/${release}/`);
    const url = new URL(reference, base);
    if (url.origin !== base.origin) throw new Error('Game release references an external runtime asset');
    const file = decodeURIComponent(url.pathname.slice(1));
    if (!file.startsWith(release + '/') || !files.has(file) || files.get(file).size <= 0) {
      throw new Error(`Game release asset is missing or outside its version: ${reference}`);
    }
    if (attribute === 'src') scripts++;
  }
  if (!scripts) throw new Error('Configured game release has no built script');
}
