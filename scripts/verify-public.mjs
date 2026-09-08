import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const run = promisify(execFile),
  root = fileURLToPath(new URL('../', import.meta.url));
const receiptPath = path.join(root, 'qa/deployment.json');
const receipt = JSON.parse(await readFile(receiptPath));
const manifest = JSON.parse(await readFile(path.join(root, 'qa/build-manifest.json')));
if (receipt.version !== manifest.version) throw new Error('Deployment and local build versions differ');
const verifiedFiles = await Promise.all(
  Object.entries(manifest.files).map(async ([file, expected]) => {
    const { stdout } = await run(
      'curl',
      [
        '--fail',
        '--silent',
        '--show-error',
        '--location',
        '--max-time',
        '40',
        new URL(file, receipt.url).href,
      ],
      { encoding: 'buffer', maxBuffer: 8 * 1024 * 1024 },
    );
    const sha256 = createHash('sha256').update(stdout).digest('hex');
    if (sha256 !== expected.sha256) throw new Error(`Public bytes do not match: ${file}`);
    return { file, bytes: stdout.length, sha256, matched: true };
  }),
);
receipt.verifiedFiles = verifiedFiles;
receipt.status = 'public-files-verified';
receipt.verifiedAt = new Date().toISOString();
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      url: receipt.url,
      commit: receipt.commit,
      status: receipt.status,
      verifiedFiles: verifiedFiles.length,
      bytes: verifiedFiles.reduce((n, file) => n + file.bytes, 0),
    },
    null,
    2,
  ),
);
