import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHosting } from './landing-publication.mjs';
import { validateGameManifest, readGameFiles, assertGameReleaseAvailable, createGameTree } from './game-publication.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2), option = (name) => args[args.indexOf(name) + 1];
const allowed = new Set(['--hosting-receipt', '--prefix', '--dry-run']);
for (let index = 0; index < args.length; index++) {
  const arg = args[index];
  if (!allowed.delete(arg) || (arg !== '--dry-run' && (!args[index + 1] || args[index + 1].startsWith('--')))) {
    throw new Error('Use --hosting-receipt <existing receipt> --prefix <new immutable path> [--dry-run]');
  }
  if (arg !== '--dry-run') index++;
}
if (allowed.has('--hosting-receipt') || allowed.has('--prefix')) {
  throw new Error('Use --hosting-receipt <existing receipt> --prefix <new immutable path> [--dry-run]');
}
const hostingPath = path.resolve(option('--hosting-receipt')),
  hosting = JSON.parse(await readFile(hostingPath));
const hostingURL = validateHosting(hosting);
const manifest = JSON.parse(await readFile(path.join(root, 'qa/build-manifest.json')));
const packageInfo = JSON.parse(await readFile(path.join(root, 'package.json')));
const prefix = option('--prefix').replace(/\/$/, '');
const catalogPath = path.join(root, 'config/catalog.json');
const catalog = JSON.parse(await readFile(catalogPath));
validateGameManifest(manifest, catalog, packageInfo, prefix);
const files = await readGameFiles(path.join(root, 'dist'), manifest);
const plan = {
  repository: hosting.repository,
  previousCommit: hosting.commit,
  prefix,
  files: files.map((file) => `${prefix}/${file.path}`),
  bytes: manifest.bytes,
  url: new URL(`${prefix}/`, hostingURL).href,
  fixedEntry: new URL(`${catalog.landingPrefix}/`, hostingURL).href,
};
if (args.includes('--dry-run')) {
  console.log(JSON.stringify({ ...plan, status: 'local-plan-validated', remoteReleaseChecked: false }, null, 2));
  process.exit(0);
}
const api = (endpoint, method = 'GET', input) =>
  JSON.parse(
    execFileSync('gh', ['api', endpoint, '--method', method, ...(input ? ['--input', '-'] : [])], {
      input: input ? JSON.stringify(input) : undefined,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    }),
  );
const repository = api(`repos/${hosting.repository}`),
  account = api('user');
if (repository.id !== hosting.repositoryId || account.login !== hosting.repository.split('/')[0])
  throw new Error('Hosting identity mismatch');
const ref = api(`repos/${hosting.repository}/git/ref/heads/${repository.default_branch}`);
if (ref.object.sha !== hosting.commit) throw new Error('Remote changed; inspect before publishing');
const head = api(`repos/${hosting.repository}/git/commits/${hosting.commit}`);
const existing = api(`repos/${hosting.repository}/git/trees/${head.tree.sha}?recursive=1`);
assertGameReleaseAvailable(prefix, existing);
const tree = createGameTree(files, prefix, hosting.repository, api);
const nextTree = api(`repos/${hosting.repository}/git/trees`, 'POST', {
  base_tree: head.tree.sha,
  tree,
});
const commit = api(`repos/${hosting.repository}/git/commits`, 'POST', {
  message: `feat: add ${packageInfo.name} ${manifest.version}`,
  tree: nextTree.sha,
  parents: [head.sha],
});
api(`repos/${hosting.repository}/git/refs/heads/${repository.default_branch}`, 'PATCH', {
  sha: commit.sha,
  force: false,
});
const receipt = {
  ...plan,
  version: manifest.version,
  commit: commit.sha,
  status: 'content-published',
  publishedAt: new Date().toISOString(),
};
await writeFile(path.join(root, 'qa/deployment.json'), JSON.stringify(receipt, null, 2) + '\n');
// Advance the shared host revision without changing the existing game's files.
hosting.commit = commit.sha;
hosting.additionalPrototypes = [
  ...(hosting.additionalPrototypes || []),
  { name: packageInfo.name, version: manifest.version, url: plan.url, commit: commit.sha },
];
await writeFile(hostingPath, JSON.stringify(hosting, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));

// Move the fixed entry only after the new immutable game release exists.
catalog.release = prefix;
await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
execFileSync(process.execPath, [path.join(root, 'scripts/build-landing.mjs'), '--hosting-receipt', hostingPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [path.join(root, 'scripts/publish-landing.mjs'), '--hosting-receipt', hostingPath], { cwd: root, stdio: 'inherit' });
