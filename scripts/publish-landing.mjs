import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLandingFiles, sha256, validateHosting, validateLandingManifest, validateReleaseTree } from './landing-publication.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const index = args.indexOf('--hosting-receipt');
if (index < 0 || !args[index + 1] || args[index + 1].startsWith('--') ||
    args.some((arg, position) => position !== index && position !== index + 1 && arg !== '--dry-run')) {
  throw new Error('Use --hosting-receipt <existing receipt> [--dry-run]');
}
const hostingPath = path.resolve(args[index + 1]);
const [hostingText, manifestText, catalogText, packageText] = await Promise.all([
  readFile(hostingPath, 'utf8'),
  readFile(path.join(root, 'qa/landing-build-manifest.json'), 'utf8'),
  readFile(path.join(root, 'config/catalog.json'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
]);
const hosting = JSON.parse(hostingText), manifest = JSON.parse(manifestText);
const hostingURL = validateHosting(hosting);
const { prefix, release } = validateLandingManifest(manifest, JSON.parse(catalogText), JSON.parse(packageText));
const files = await readLandingFiles(path.join(root, 'landing-dist'), manifest);
const tree = files.map((file) => ({ ...file, path: `${prefix}/${file.path}` }));
const plan = {
  repository: hosting.repository,
  previousCommit: hosting.commit,
  prefix,
  release,
  files: tree.map((file) => file.path),
  bytes: manifest.bytes,
  url: new URL(`${prefix}/`, hostingURL).href,
  manifestSha256: sha256(manifestText),
};
if (args.includes('--dry-run')) {
  console.log(JSON.stringify({ ...plan, status: 'local-plan-validated', remoteReleaseChecked: false }, null, 2));
  process.exit(0);
}
const api = (endpoint, method = 'GET', input) => JSON.parse(execFileSync('gh', [
  'api', endpoint, '--method', method, ...(input ? ['--input', '-'] : []),
], {
  input: input ? JSON.stringify(input) : undefined,
  encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
}));
const repository = api(`repos/${hosting.repository}`), account = api('user');
if (repository.id !== hosting.repositoryId || account.login !== hosting.repository.split('/')[0]) {
  throw new Error('Hosting identity mismatch');
}
const ref = api(`repos/${hosting.repository}/git/ref/heads/${repository.default_branch}`);
if (ref.object.sha !== hosting.commit) throw new Error('Remote changed; inspect before publishing');
const head = api(`repos/${hosting.repository}/git/commits/${hosting.commit}`);
const existing = api(`repos/${hosting.repository}/git/trees/${head.tree.sha}?recursive=1`);
if (existing.truncated || !Array.isArray(existing.tree)) throw new Error('Remote tree is incomplete; cannot verify publication boundaries');
const releaseEntry = existing.tree.find((entry) => entry.path === `${release}/index.html` && entry.type === 'blob');
if (!releaseEntry) throw new Error('Publish the configured game release before updating the fixed entry');
const releaseBlob = api(`repos/${hosting.repository}/git/blobs/${releaseEntry.sha}`);
if (releaseBlob.encoding !== 'base64') throw new Error('Unsupported game release entry encoding');
const releaseHTML = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(releaseBlob.content, 'base64'));
validateReleaseTree(release, existing.tree, releaseHTML);
const remoteFiles = new Map(existing.tree.map((entry) => [entry.path, entry]));
for (const file of tree) {
  const previous = remoteFiles.get(file.path);
  if (previous && (previous.type !== 'blob' || previous.mode !== '100644')) {
    throw new Error(`Landing path conflicts with an existing non-regular file: ${file.path}`);
  }
}
const nextTree = api(`repos/${hosting.repository}/git/trees`, 'POST', { base_tree: head.tree.sha, tree });
const commit = api(`repos/${hosting.repository}/git/commits`, 'POST', {
  message: `feat: update quiet-workshop fixed entry for ${manifest.version}`,
  tree: nextTree.sha, parents: [head.sha],
});
api(`repos/${hosting.repository}/git/refs/heads/${repository.default_branch}`, 'PATCH', { sha: commit.sha, force: false });
const receipt = {
  ...plan, version: manifest.version, commit: commit.sha,
  status: 'content-published', publishedAt: new Date().toISOString(),
};
const receiptPath = path.join(root, 'qa/landing-deployment.json');
await mkdir(path.dirname(receiptPath), { recursive: true });
await writeFile(receiptPath + '.next', JSON.stringify(receipt, null, 2) + '\n');
await rename(receiptPath + '.next', receiptPath);
// Preserve all hosting metadata and game receipts; only advance the expected remote revision.
const currentHosting = JSON.parse(await readFile(hostingPath, 'utf8'));
if (currentHosting.commit !== hosting.commit) throw new Error(`Fixed entry published at ${commit.sha}, but hosting receipt changed concurrently; inspect before advancing it`);
currentHosting.commit = commit.sha;
await writeFile(hostingPath + '.next', JSON.stringify(currentHosting, null, 2) + '\n');
await rename(hostingPath + '.next', hostingPath);
console.log(JSON.stringify(receipt, null, 2));
