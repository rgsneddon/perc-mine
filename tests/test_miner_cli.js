import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('miner --help names BeamHash III and Perc ports', () => {
  const r = spawnSync(process.execPath, ['src/miner.js', '--help'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /BeamHash III/);
  assert.match(r.stdout, /1466/);
  assert.match(r.stdout, /3334/);
  assert.match(r.stdout, /perc-stratum-pool/);
});

test('pool config and README keep the beam-mine linked-repo split', () => {
  const cfg = JSON.parse(readFileSync(path.join(root, 'pool_configs/perc.json'), 'utf8'));
  assert.deepEqual(cfg.ports, [1466, 3334]);
  assert.match(cfg.linked.stratum, /perc-stratum-pool/);
  assert.match(cfg.linked.basic, /basic/);
  const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.match(readme, /beam-mine/);
  assert.match(readme, /perc-stratum-pool/);
  assert.match(readme, /rgsneddon\/basic/);
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.match(pkg.dependencies['perc-stratum-pool'], /perc-stratum-pool\.git/);
});
