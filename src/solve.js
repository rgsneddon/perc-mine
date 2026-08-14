import {
  applyMix,
  checkShare,
  collisionBits,
  combineRows,
  individualWork,
  packShare,
  seedWorkBits,
  COLLISION_BITS,
  WORK_BIT_SIZE,
} from './beamhash_iii.js';

function leftoverZero(row) {
  let v = 0n;
  for (let i = 6; i >= 0; i--) v = (v << 64n) | (row.work[i] & 0xffffffffffffffffn);
  return v === 0n;
}

/**
 * CPU Wagner search over a leaf window. Uses the shipped mix/combine/check path.
 */
export function solveOnce(preWork, nonce8, extra4, leafCount = 1 << 17) {
  const work32 = individualWork(preWork, nonce8, extra4);
  let rows = new Array(leafCount);
  for (let i = 0; i < leafCount; i++) {
    rows[i] = { indices: [i], work: seedWorkBits(work32, i) };
  }
  for (let round = 1; round <= 5; round++) {
    let remLen = WORK_BIT_SIZE - (round - 1) * COLLISION_BITS;
    if (round === 5) remLen -= 64;
    for (const r of rows) applyMix(r, remLen);
    const buckets = new Map();
    for (const r of rows) {
      const k = collisionBits(r);
      let g = buckets.get(k);
      if (!g) {
        g = [];
        buckets.set(k, g);
      }
      g.push(r);
    }
    remLen = WORK_BIT_SIZE - round * COLLISION_BITS;
    if (round === 4) remLen -= 64;
    if (round === 5) remLen = COLLISION_BITS;
    const next = [];
    for (const group of buckets.values()) {
      const n = group.length;
      if (n < 2) continue;
      const cap = Math.min(n, 32);
      for (let i = 0; i < cap; i++) {
        for (let j = i + 1; j < cap; j++) {
          const left = group[i].indices[0] < group[j].indices[0] ? group[i] : group[j];
          const right = left === group[i] ? group[j] : group[i];
          const c = combineRows(left, right, remLen);
          if (c) next.push(c);
        }
      }
    }
    rows = next;
    if (!rows.length) return null;
  }
  for (const row of rows) {
    if (!leftoverZero(row)) continue;
    const packed = packShare(nonce8, extra4, row.indices);
    const checked = checkShare({
      preWork,
      nonce: packed.nonce,
      solution: packed.solution,
    });
    if (checked.ok) return packed;
  }
  return null;
}

export function hex8(n) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(BigInt(n) & 0xffffffffffffffffn);
  return b;
}

export function extraFromInt(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0);
  return b;
}
