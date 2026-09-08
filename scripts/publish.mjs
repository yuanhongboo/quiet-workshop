import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2),
  option = (name) => args[args.indexOf(name) + 1];
if (!args.includes('--hosting-receipt') || !args.includes('--prefix'))
  throw new Error(
    'Use --hosting-receipt <existing receipt> --prefix <new immutable path> [--dry-run]',
  );
const hostingPath = path.resolve(option('--hosting-receipt')),
  hosting = JSON.parse(await readFile(hostingPath));
const manifest = JSON.parse(await readFile(path.join(root, 'qa/build-manifest.json')));
const packageInfo = JSON.parse(await readFile(path.join(root, 'package.json')));
if (manifest.version !== packageInfo.version) throw new Error('Build version does not match package; rebuild before publishing');
const prefix = option('--prefix').replace(/\/$/, '');
const catalogPath = path.join(root, 'config/catalog.json');
const catalog = JSON.parse(await readFile(catalogPath));
if (prefix !== `${catalog.landingPrefix}/v${manifest.version}`) throw new Error('Game publication must match the fixed entry catalog');
if (!/^[a-z0-9][a-z0-9./-]+$/.test(prefix) || prefix.split('/').includes('..'))
  throw new Error('Invalid publication prefix');
const tree = [];
for (const [file, expected] of Object.entries(manifest.files)) {
  const bytes = await readFile(path.join(root, 'dist', file));
  if (createHash('sha256').update(bytes).digest('hex') !== expected.sha256)
    throw new Error(`Build changed: ${file}`);
  tree.push({
    path: `${prefix}/${file}`,
    mode: '100644',
    type: 'blob',
    content: bytes.toString('utf8'),
  });
}
const plan = {
  repository: hosting.repository,
  previousCommit: hosting.commit,
  prefix,
  files: tree.map((file) => file.path),
  bytes: manifest.bytes,
  url: new URL(`${prefix}/`, hosting.url).href,
  fixedEntry: new URL(`${catalog.landingPrefix}/`, hosting.url).href,
};
if (args.includes('--dry-run')) {
  console.log(JSON.stringify(plan, null, 2));
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
if (existing.tree.some((file) => file.path.startsWith(prefix + '/')))
  throw new Error('Immutable prototype path already exists');
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
