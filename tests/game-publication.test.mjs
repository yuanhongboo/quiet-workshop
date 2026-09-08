import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink, rm, copyFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from '../scripts/landing-publication.mjs';
import {
  assertGameFile, validateGameManifest, readGameFiles, assertGameReleaseAvailable, createGameTree,
} from '../scripts/game-publication.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const packageInfo = { name: 'quiet-workshop', version: '0.4.2' };
const catalog = { landingPrefix: 'quiet-workshop', release: 'quiet-workshop/v0.4.1' };
const prefix = 'quiet-workshop/v0.4.2';
const hosting = { repository: 'owner/game', repositoryId: 1, commit: 'a'.repeat(40), url: 'https://owner.github.io/game/' };
const html = '\ufeff<html>好好收拾</html>';
const audio = Buffer.from([0x49, 0x44, 0x33, 0, 0xff, 0xfb, 0xc0, 0xaf, 0x80, 0xfe]);
const manifestFor = (files) => ({
  version: packageInfo.version,
  files: Object.fromEntries(Object.entries(files).map(([file, content]) => [file, {
    bytes: Buffer.byteLength(content), sha256: sha256(content),
  }])),
  bytes: Object.values(files).reduce((sum, content) => sum + Buffer.byteLength(content), 0),
});
async function writeBuild(directory, files) {
  for (const [file, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(directory, file)), { recursive: true });
    await writeFile(path.join(directory, file), content);
  }
}

test('game publication allows runtime MP3 and excludes drafts, source data and path escapes', () => {
  for (const file of [
    'index.html', 'CREDITS.txt', 'assets/game-abc.js', 'assets/game.css', 'assets/icon.svg',
    'assets/after-the-light-Ab09.mp3', 'licenses/piano-font.txt',
  ]) assert.equal(assertGameFile(file), file);
  for (const file of [
    '../index.html', '/index.html', 'assets/../../index.html', 'assets/./song.mp3',
    'assets\\song.mp3', 'assets/%2e%2e/song.mp3', 'assets/song.mp3?x', 'assets/song.mp3#x',
    'assets/song.mp3/secret.js', 'assets/nested/song.mp3', 'assets/song.wav', 'assets/cache.json',
    'music/drafts/song.mp3', 'config/hosting.json', 'qa/player-save.json', 'src/audio.mjs', 'CREDITS.md',
  ]) assert.throws(() => assertGameFile(file), /Invalid game publication file/, file);
});

test('manifest pins the new game version and verifies every metadata value and byte total', () => {
  const manifest = manifestFor({ 'index.html': html, 'assets/song.mp3': audio });
  assert.doesNotThrow(() => validateGameManifest(manifest, catalog, packageInfo, prefix));
  for (const invalidPrefix of ['other/v0.4.2', '../quiet-workshop/v0.4.2', 'quiet-workshop/v0.4.1']) {
    assert.throws(() => validateGameManifest(manifest, catalog, packageInfo, invalidPrefix), /catalog/);
  }
  for (const landingPrefix of ['../quiet-workshop', 'quiet-workshop/v1', '/quiet-workshop', 'quiet-workshop/']) {
    assert.throws(() => validateGameManifest(manifest, { ...catalog, landingPrefix }, packageInfo, prefix), /prefix/);
  }
  assert.throws(() => validateGameManifest({ ...manifest, version: '0.4.1' }, catalog, packageInfo, prefix), /version/);
  assert.throws(() => validateGameManifest({ ...manifest, bytes: manifest.bytes + 1 }, catalog, packageInfo, prefix), /byte total/);
  assert.throws(() => validateGameManifest({ ...manifest, files: {} }, catalog, packageInfo, prefix), /index.html/);
  for (const metadata of [{ bytes: 0, sha256: 'a'.repeat(64) }, { bytes: 1, sha256: 'invalid' }]) {
    assert.throws(() => validateGameManifest({ ...manifest, files: { 'index.html': metadata } }, catalog, packageInfo, prefix), /metadata/);
  }
});

test('non-UTF8 MP3 bytes survive base64 blob upload exactly; UTF8 text keeps its content', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'quiet-game-binary-'));
  try {
    const source = { 'index.html': html, 'assets/song.mp3': audio };
    await writeBuild(directory, source);
    const files = await readGameFiles(directory, manifestFor(source));
    const calls = [];
    const tree = createGameTree(files, prefix, hosting.repository, (endpoint, method, input) => {
      calls.push({ endpoint, method, input });
      assert.equal(input.encoding, 'base64');
      const bytes = Buffer.from(input.content, input.encoding);
      assert.deepEqual(bytes, audio);
      return { sha: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') };
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].endpoint, 'repos/owner/game/git/blobs');
    assert.equal(calls[0].method, 'POST');
    assert.deepEqual(tree[0], { path: `${prefix}/index.html`, mode: '100644', type: 'blob', content: html });
    assert.equal(tree[1].path, `${prefix}/assets/song.mp3`);
    assert.match(tree[1].sha, /^[a-f0-9]{40}$/);
    assert.equal(Object.hasOwn(tree[1], 'content'), false);
    assert.throws(() => createGameTree(files, prefix, hosting.repository, () => ({ sha: 'bad' })), /does not match/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('same-size modified audio and mismatched bytes are rejected before any upload', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'quiet-game-changed-'));
  try {
    const source = { 'index.html': html, 'assets/song.mp3': audio };
    await writeBuild(directory, source);
    const manifest = manifestFor(source);
    const changed = Buffer.from(audio); changed[changed.length - 1] ^= 1;
    await writeFile(path.join(directory, 'assets/song.mp3'), changed);
    await assert.rejects(readGameFiles(directory, manifest), /Build changed: assets\/song.mp3/);
    await writeFile(path.join(directory, 'assets/song.mp3'), audio);
    manifest.files['assets/song.mp3'].bytes++;
    await assert.rejects(readGameFiles(directory, manifest), /Build changed: assets\/song.mp3/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('symlinks and non-regular build entries are rejected including inside-directory links', async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'quiet-game-paths-'));
  try {
    const directory = path.join(temporary, 'dist');
    await mkdir(directory);
    const manifest = manifestFor({ 'index.html': html });
    await writeFile(path.join(temporary, 'outside.html'), html);
    await symlink(path.join(temporary, 'outside.html'), path.join(directory, 'index.html'));
    await assert.rejects(readGameFiles(directory, manifest), /symlink/);
    await rm(path.join(directory, 'index.html'));
    await writeFile(path.join(directory, 'actual.html'), html);
    await symlink('actual.html', path.join(directory, 'index.html'));
    await assert.rejects(readGameFiles(directory, manifest), /symlink/);
    await rm(path.join(directory, 'index.html'));
    await mkdir(path.join(directory, 'index.html'));
    await assert.rejects(readGameFiles(directory, manifest), /regular file/);
    await rm(path.join(directory, 'index.html'), { recursive: true });
    await writeFile(path.join(directory, 'index.html'), html);
    await mkdir(path.join(directory, 'actual-assets'));
    await writeFile(path.join(directory, 'actual-assets/song.mp3'), audio);
    await symlink('actual-assets', path.join(directory, 'assets'));
    await assert.rejects(readGameFiles(directory, manifestFor({ 'index.html': html, 'assets/song.mp3': audio })), /symlink/);
    await symlink(directory, path.join(temporary, 'linked-dist'));
    await assert.rejects(readGameFiles(path.join(temporary, 'linked-dist'), manifest), /regular directory/);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test('binary content cannot be disguised as a text runtime file', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'quiet-game-text-'));
  try {
    for (const content of [audio, Buffer.from([0x41, 0, 0x42])]) {
      await writeBuild(directory, { 'index.html': content });
      await assert.rejects(readGameFiles(directory, manifestFor({ 'index.html': content })), /UTF-8|Binary/);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('remote paths must be vacant and the remote tree complete before binary uploads', () => {
  const parent = { path: 'quiet-workshop', type: 'tree', mode: '040000' };
  assert.doesNotThrow(() => assertGameReleaseAvailable(prefix, { tree: [parent] }));
  for (const existing of [
    { truncated: true, tree: [] }, {},
    { tree: [{ path: prefix, type: 'tree' }] },
    { tree: [{ path: `${prefix}/index.html`, type: 'blob' }] },
    { tree: [{ ...parent, type: 'blob', mode: '100644' }] },
  ]) assert.throws(() => assertGameReleaseAvailable(prefix, existing), /incomplete|already exists|conflicts/);
});

test('actual dry-run validates all bytes but never calls GitHub or changes receipts', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'quiet-game-dry-run-'));
  try {
    for (const folder of ['scripts', 'qa', 'config', 'bin']) await mkdir(path.join(directory, folder));
    for (const file of ['publish.mjs', 'game-publication.mjs', 'landing-publication.mjs']) {
      await copyFile(path.join(root, 'scripts', file), path.join(directory, 'scripts', file));
    }
    const source = { 'index.html': html, 'assets/song.mp3': audio };
    await writeBuild(path.join(directory, 'dist'), source);
    const inputs = {
      'package.json': packageInfo, 'qa/build-manifest.json': manifestFor(source),
      'config/catalog.json': catalog, 'config/hosting.json': hosting,
    };
    for (const [file, content] of Object.entries(inputs)) await writeFile(path.join(directory, file), JSON.stringify(content));
    await writeFile(path.join(directory, 'bin/gh'), '#!/bin/sh\necho called > gh-called\nexit 99\n', { mode: 0o755 });
    const run = () => spawnSync(process.execPath, ['scripts/publish.mjs', '--hosting-receipt', 'config/hosting.json', '--prefix', prefix, '--dry-run'], {
      cwd: directory, env: { ...process.env, PATH: path.join(directory, 'bin') + path.delimiter + process.env.PATH }, encoding: 'utf8',
    });
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    const plan = JSON.parse(result.stdout);
    assert.equal(plan.status, 'local-plan-validated');
    assert.equal(plan.remoteReleaseChecked, false);
    assert.deepEqual(plan.files, [`${prefix}/index.html`, `${prefix}/assets/song.mp3`]);
    await assert.rejects(access(path.join(directory, 'gh-called')));
    await assert.rejects(access(path.join(directory, 'qa/deployment.json')));
    for (const [file, content] of Object.entries(inputs)) {
      assert.equal(await readFile(path.join(directory, file), 'utf8'), JSON.stringify(content));
    }
    await writeFile(path.join(directory, 'dist/assets/song.mp3'), Buffer.alloc(audio.length));
    const rejected = run();
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /Build changed/);
    await assert.rejects(access(path.join(directory, 'gh-called')));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
