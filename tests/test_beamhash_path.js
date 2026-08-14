import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyMix,
  buildJob,
  checkShare,
  collisionBits,
  combineRows,
  defaultPreWork,
  individualWork,
  packShare,
  seedWorkBits,
  WORK_BIT_SIZE,
  COLLISION_BITS,
} from '../src/beamhash_iii.js';

test('buildJob carries Perc BeamHash III fields', () => {
  const job = buildJob({ height: 7, jobId: 'perc-7-1' });
  assert.equal(job.algorithm, 'beamhashIII');
  assert.equal(job.coin, 'PERC');
  assert.equal(job.height, 7);
  assert.equal(job.input.length, 64);
});

test('checkShare rejects a random packed tree', () => {
  const pre = defaultPreWork(1);
  const nonce = Buffer.alloc(8, 1);
  const fake = Buffer.alloc(104, 2);
  const got = checkShare({ preWork: pre, nonce, solution: fake });
  assert.equal(got.ok, false);
});

test('shipped mix+combine is what a CPU miner pairs on', () => {
  const pre = defaultPreWork(3);
  const work32 = individualWork(pre, Buffer.alloc(8, 3), Buffer.alloc(4, 4));
  const a = { indices: [1], work: seedWorkBits(work32, 1) };
  const b = { indices: [2], work: seedWorkBits(work32, 2) };
  applyMix(a, WORK_BIT_SIZE);
  applyMix(b, WORK_BIT_SIZE);
  const rem = WORK_BIT_SIZE - COLLISION_BITS;
  const left = a.indices[0] < b.indices[0] ? a : b;
  const right = left === a ? b : a;
  const c = combineRows(left, right, rem);
  if (collisionBits(a) === collisionBits(b)) {
    assert.ok(c);
    assert.equal(c.indices.length, 2);
  } else {
    assert.equal(c, null);
  }
});

test('packShare length is 8+104 wire', () => {
  const indices = [];
  for (let i = 0; i < 32; i++) indices.push(i);
  const packed = packShare(Buffer.alloc(8, 9), Buffer.alloc(4, 8), indices);
  assert.equal(packed.nonce.length, 8);
  assert.equal(packed.solution.length, 104);
  assert.equal(packed.wire.length, 112);
});
