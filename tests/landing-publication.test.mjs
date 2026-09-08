import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  assertLandingFile, readLandingFiles, sha256, validateHosting,
  validateLandingManifest, validateReleaseTree,
} from '../scripts/landing-publication.mjs';

const packageInfo = { version: '0.4.0' };
const catalog = { landingPrefix: 'quiet-workshop', release: 'quiet-workshop/v0.4.0' };
const html = '<!doctype html><html><script src="./assets/game.js"></script></html>';
const metadata = (content) => ({ bytes: Buffer.byteLength(content), sha256: sha256(content) });
const manifestFor = (files) => ({
  version: packageInfo.version, release: catalog.release,
  files: Object.fromEntries(Object.entries(files).map(([file, content]) => [file, metadata(content)])),
  bytes: Object.values(files).reduce((sum, content) => sum + Buffer.byteLength(content), 0),
});

test('fixed entry publication excludes releases, source data and path escapes', () => {
  for (const file of [
    '../index.html', '/index.html', 'assets/../../v0.4.0/index.html', 'v0.4.0/index.html',
    'assets\\game.js', 'assets/%2e%2e/index.html', 'assets/data.json', 'config/hosting.json',
    'src/progress.mjs', 'qa/player-save.json', 'assets/game.js?path=../', 'assets/game.js#x',
  ]) assert.throws(() => assertLandingFile(file), /Invalid landing publication file/, file);
  for (const file of ['index.html', 'assets/index-aB_09.css', 'assets/catalog-f39.js', 'assets/cover.svg']) {
    assert.equal(assertLandingFile(file), file);
  }
});

test('landing build only targets its configured immutable sibling release', () => {
  const manifest = manifestFor({ 'index.html': html });
  assert.deepEqual(validateLandingManifest(manifest, catalog, packageInfo), {
    prefix: 'quiet-workshop', release: 'quiet-workshop/v0.4.0',
  });
  for (const landingPrefix of ['../quiet-workshop', '/quiet-workshop', 'quiet-workshop/',
    'quiet-workshop/v0.4.0', 'quiet-workshop/v1', 'quiet-workshop/%2e%2e', 'quiet\\workshop']) {
    assert.throws(() => validateLandingManifest(manifest, { ...catalog, landingPrefix }, packageInfo));
  }
  for (const release of ['quiet-workshop/v0.3.1', 'other-game/v0.4.0', 'quiet-workshop/v0.4.0/../index.html']) {
    assert.throws(() => validateLandingManifest({ ...manifest, release }, { ...catalog, release }, packageInfo));
  }
  assert.throws(() => validateLandingManifest({ ...manifest, version: '0.3.1' }, catalog, packageInfo));
  assert.throws(() => validateLandingManifest({ ...manifest, bytes: manifest.bytes + 1 }, catalog, packageInfo));
});

test('release target must have a real HTML entry and all referenced runtime assets', () => {
  const entries = [
    { path: `${catalog.release}/index.html`, type: 'blob', size: 100 },
    { path: `${catalog.release}/assets/game.js`, type: 'blob', size: 40 },
    { path: `${catalog.release}/assets/game.css`, type: 'blob', size: 20 },
  ];
  assert.doesNotThrow(() => validateReleaseTree(catalog.release, entries, html));
  assert.throws(() => validateReleaseTree(catalog.release, entries.slice(0, 1), html), /missing/);
  assert.throws(() => validateReleaseTree(catalog.release, entries, '<html>Coming soon</html>'), /no built script/);
  assert.throws(() => validateReleaseTree(catalog.release, entries, html.replace('./assets/game.js', '../v0.3.1/assets/game.js')), /missing or outside/);
  assert.throws(() => validateReleaseTree(catalog.release, entries, html.replace('./assets/game.js', 'https://cdn.invalid/game.js')), /external runtime/);
  assert.throws(() => validateReleaseTree(catalog.release, entries, 'Not found'), /valid HTML/);
});

test('only public directory hosting coordinates are accepted', () => {
  const hosting = { repository: 'owner/game', repositoryId: 1, commit: 'a'.repeat(40), url: 'https://owner.github.io/game/' };
  assert.equal(validateHosting(hosting).href, hosting.url);
  for (const url of ['http://owner.github.io/game/', 'https://secret@owner.github.io/game/',
    'https://owner.github.io/game/?token=secret', 'https://owner.github.io/game']) {
    assert.throws(() => validateHosting({ ...hosting, url }));
  }
});

test('changed build bytes and filesystem escapes cannot enter the publication tree', async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'quiet-landing-publication-'));
  try {
    const directory = path.join(temporary, 'build');
    await mkdir(directory);
    await writeFile(path.join(directory, 'index.html'), html);
    const manifest = manifestFor({ 'index.html': html });
    assert.equal((await readLandingFiles(directory, manifest))[0].content, html);
    await writeFile(path.join(directory, 'index.html'), html + 'changed');
    await assert.rejects(readLandingFiles(directory, manifest), /build changed/);
    await rm(path.join(directory, 'index.html'));
    await writeFile(path.join(temporary, 'private.html'), html);
    await symlink(path.join(temporary, 'private.html'), path.join(directory, 'index.html'));
    await assert.rejects(readLandingFiles(directory, manifest), /leaves the build directory/);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test('binary assets are rejected and UTF-8 text is preserved exactly', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'quiet-landing-text-'));
  try {
    for (const bytes of [Buffer.from([0xc0, 0xaf]), Buffer.from([0x41, 0, 0x42])]) {
      await writeFile(path.join(directory, 'index.html'), bytes);
      await assert.rejects(readLandingFiles(directory, manifestFor({ 'index.html': bytes })), /UTF-8|Binary/);
    }
    const content = '\ufeff<html>好好收拾</html>';
    await writeFile(path.join(directory, 'index.html'), content);
    assert.equal((await readLandingFiles(directory, manifestFor({ 'index.html': content })))[0].content, content);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
