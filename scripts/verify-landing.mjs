import { readFile, writeFile, rename } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { sha256, validateHosting, validateLandingManifest } from './landing-publication.mjs';

const run = promisify(execFile), root = fileURLToPath(new URL('../', import.meta.url));
const receiptPath = path.join(root, 'qa/landing-deployment.json');
const [receiptText, manifestText, catalogText, packageText, hostingText] = await Promise.all([
  readFile(receiptPath, 'utf8'),
  readFile(path.join(root, 'qa/landing-build-manifest.json'), 'utf8'),
  readFile(path.join(root, 'config/catalog.json'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(root, 'config/hosting.json'), 'utf8'),
]);
const receipt = JSON.parse(receiptText), manifest = JSON.parse(manifestText), hosting = JSON.parse(hostingText);
const { prefix, release } = validateLandingManifest(manifest, JSON.parse(catalogText), JSON.parse(packageText));
const url = new URL(`${prefix}/`, validateHosting(hosting)).href;
if (receipt.version !== manifest.version || receipt.release !== release || receipt.prefix !== prefix ||
    receipt.url !== url || receipt.repository !== hosting.repository || receipt.manifestSha256 !== sha256(manifestText) ||
    JSON.stringify(receipt.files?.slice().sort()) !== JSON.stringify(Object.keys(manifest.files).map((file) => `${prefix}/${file}`).sort())) {
  throw new Error('Landing deployment does not match the local build and configured fixed entry');
}
const verifiedFiles = await Promise.all(Object.entries(manifest.files).map(async ([file, expected]) => {
  const { stdout } = await run('curl', [
    '--fail', '--silent', '--show-error', '--location', '--max-time', '40',
    new URL(file, url).href,
  ], { encoding: 'buffer', maxBuffer: 8 * 1024 * 1024 });
  const hash = sha256(stdout);
  if (stdout.length !== expected.bytes || hash !== expected.sha256) throw new Error(`Public landing bytes do not match: ${file}`);
  return { file, bytes: stdout.length, sha256: hash, matched: true };
}));
receipt.verifiedFiles = verifiedFiles;
receipt.status = 'public-files-verified';
receipt.verifiedAt = new Date().toISOString();
await writeFile(receiptPath + '.next', JSON.stringify(receipt, null, 2) + '\n');
await rename(receiptPath + '.next', receiptPath);
console.log(JSON.stringify({
  url, release, commit: receipt.commit, status: receipt.status,
  verifiedFiles: verifiedFiles.length, bytes: verifiedFiles.reduce((sum, file) => sum + file.bytes, 0),
}, null, 2));
