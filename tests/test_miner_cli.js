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

test('print-config parses 1-thread Helsinki/Germany/Singapore workers', () => {
  const wallet = 'percpriv193bfbb92db68043f010592e879396c724d488b30';
  for (const worker of ['Helsinki', 'Germany', 'Singapore']) {
    for (let i = 0; i < 2; i++) {
      const printed = spawnSync(
        process.execPath,
        [
          'src/miner.js',
          '--print-config',
          '--pool',
          'mineperc.restoreprivacy.online:1466',
          '--user',
          `${wallet}.${worker}`,
          '--threads',
          '1',
        ],
        { cwd: root, encoding: 'utf8' },
      );
      assert.equal(printed.status, 0, printed.stderr);
      const cfg = JSON.parse(printed.stdout);
      assert.equal(cfg.host, 'mineperc.restoreprivacy.online');
      assert.equal(cfg.port, 1466);
      assert.equal(cfg.pool, 'mineperc.restoreprivacy.online:1466');
      assert.equal(cfg.user, `${wallet}.${worker}`);
      assert.equal(cfg.threads, 1);
    }
  }
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
