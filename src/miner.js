#!/usr/bin/env node
/**
 * perc-mine — Perccent (PERC) CPU miner, BeamHash III.
 * Speaks the same login/job/solution wire as perc-stratum-pool.
 */
import tls from 'tls';
import net from 'net';
import { solveOnce, hex8, extraFromInt } from './solve.js';
import { defaultPreWork } from './beamhash_iii.js';

const HELP = `perc-mine 1.0.0 — Perccent CPU miner (BeamHash III)

Usage:
  perc-mine --pool mineperc.restoreprivacy.online:1466 --user PERC_USERNAME.WORKER
  perc-mine --pool mineperc.restoreprivacy.online:3334 --user PERC_USERNAME.WORKER

Options:
  --pool HOST:PORT   default mineperc.restoreprivacy.online:1466 (normal)
                     3334 is high-diff. Beam ports 1690/1974 are not Perc.
  --user NAME.RIG    Perccent identity. Payouts are PERC.
  --notls            plain TCP instead of TLS
  --leaves N         Wagner leaf window (default 131072)
  --help             this text

Needs Node.js 18+. Linked stratum: https://github.com/rgsneddon/perc-stratum-pool
`;

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  process.stdout.write(HELP);
  process.exit(0);
}

const pool = arg('--pool', 'mineperc.restoreprivacy.online:1466');
const user = arg('--user', 'PERC_USERNAME.WORKER');
const useTls = !process.argv.includes('--notls');
const leaves = Number(arg('--leaves', '131072'));
const [host, portStr] = pool.split(':');
const port = Number(portStr || 1466);

if (port === 1690 || port === 1974) {
  console.error('ports 1690/1974 are Beam. Perc uses 1466 (normal) or 3334 (high-diff).');
  process.exit(2);
}

function send(sock, obj) {
  sock.write(JSON.stringify(obj) + '\n');
}

function asPreWork(job) {
  const raw = job?.input || job?.preWork;
  if (typeof raw === 'string' && raw.length >= 64) return raw.slice(0, 64);
  return defaultPreWork(job?.height || 0);
}

function connect() {
  const opts = { host, port, rejectUnauthorized: false, requestCert: false };
  return useTls ? tls.connect(opts) : net.connect(port, host);
}

console.log(`perc-mine BeamHash III CPU → ${useTls ? 'ssl' : 'tcp'}://${host}:${port} user=${user}`);

const sock = connect();
let buf = '';
let job = null;
let hashes = 0;
let running = false;

sock.setEncoding('utf8');
sock.on('secureConnect', hello);
sock.on('connect', () => {
  if (!useTls) hello();
});
sock.on('error', (e) => {
  console.error('socket', e.message);
  process.exit(1);
});
sock.on('data', (chunk) => {
  buf += chunk;
  const parts = buf.split('\n');
  buf = parts.pop();
  for (const line of parts) {
    if (!line.trim()) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (msg.method === 'job' || msg.input || msg.preWork) {
      job = msg;
      console.log(`job ${job.jobId || job.id} height=${job.height} algo=${job.algorithm || 'beamhashIII'}`);
      if (!running) mine();
    } else if (msg.description) {
      console.log('pool:', msg.description, msg.nonceprefix || msg.code || '', msg.asset || '');
    }
  }
});

function hello() {
  send(sock, {
    method: 'login',
    api_key: user,
    id: 'login',
    jsonrpc: '2.0',
  });
}

async function mine() {
  running = true;
  let nonce = 1;
  while (job) {
    const pre = asPreWork(job);
    const nonce8 = hex8(nonce++);
    for (let extra = 0; extra < 64; extra++) {
      hashes += leaves;
      const found = solveOnce(pre, nonce8, extraFromInt(extra), leaves);
      if (found) {
        send(sock, {
          method: 'solution',
          id: job.jobId || job.id || '1',
          nonce: Buffer.from(found.nonce).toString('hex'),
          output: Buffer.from(found.solution).toString('hex'),
          jsonrpc: '2.0',
        });
        console.log('submitted solution hashes~', hashes);
      }
    }
    if (nonce % 8 === 0) console.log('searching… hashes~', hashes, 'nonce', nonce);
    await new Promise((r) => setImmediate(r));
  }
}
