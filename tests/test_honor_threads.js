import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { honorThreads, parseMinerArgs } from '../src/miner.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const miner = path.join(root, 'src', 'miner.js');

test('honorThreads applies the shipped 1..64 clamp', () => {
  assert.equal(honorThreads(0).threads, 1);
  assert.equal(honorThreads(1).threads, 1);
  assert.equal(honorThreads(5).threads, 5);
  assert.equal(honorThreads(64).threads, 64);
  assert.equal(honorThreads(65).threads, 64);
  assert.equal(honorThreads('nope').threads, 1);
});

test('one third of 16 CPUs is honorThreads(floor(16/3)) === 5', () => {
  const third = Math.max(1, Math.min(64, Math.floor(16 / 3)));
  const plan = honorThreads(third);
  assert.equal(third, 5);
  assert.equal(plan.threads, 5);
  assert.equal(plan.nonceStride, 5);
  assert.equal(plan.starts.length, 5);
});

test('parseMinerArgs --threads uses honorThreads', () => {
  const third = Math.max(1, Math.min(64, Math.floor(16 / 3)));
  const cfg = parseMinerArgs([
    'node',
    'miner.js',
    '--pool',
    'mineperc.restoreprivacy.online:1466',
    '--user',
    'percpriv1a2e59c690fa6ad8efb206a40743342fad429823a.raskul',
    '--threads',
    String(third),
  ]);
  assert.equal(cfg.threads, honorThreads(third).threads);
  assert.equal(cfg.pool, 'mineperc.restoreprivacy.online:1466');
  assert.equal(cfg.user, 'percpriv1a2e59c690fa6ad8efb206a40743342fad429823a.raskul');
});

test('miner --print-config reports honorThreads for --threads 5', () => {
  const r = spawnSync(
    process.execPath,
    [
      miner,
      '--print-config',
      '--pool',
      'mineperc.restoreprivacy.online:1466',
      '--user',
      'percpriv1a2e59c690fa6ad8efb206a40743342fad429823a.raskul',
      '--threads',
      '5',
    ],
    { encoding: 'utf8' },
  );
  assert.equal(r.status, 0, r.stderr);
  const cfg = JSON.parse(r.stdout);
  assert.equal(cfg.threads, honorThreads(5).threads);
  assert.equal(cfg.pool, 'mineperc.restoreprivacy.online:1466');
  assert.equal(cfg.user, 'percpriv1a2e59c690fa6ad8efb206a40743342fad429823a.raskul');
});
