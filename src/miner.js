#!/usr/bin/env node
/**
 * perc-mine — Perccent (PERC) CPU miner, BeamHash III.
 * Speaks the same login/job/solution wire as perc-stratum-pool.
 */
import tls from 'tls';
import net from 'net';
import { solveOnce, hex8, extraFromInt } from './solve.js';
import { defaultPreWork } from './beamhash_iii.js';
import { isMainModule } from './is_main.js';

export const VERSION = '1.0.1';

export const HELP = `perc-mine ${VERSION} — Perccent CPU miner (BeamHash III)

Usage:
  perc-mine --pool mineperc.restoreprivacy.online:1466 --user PERC_USERNAME.WORKER --threads 4
  perc-mine-gui

Options:
  --pool HOST:PORT   default mineperc.restoreprivacy.online:1466 (normal)
                     3334 is high-diff. Beam ports 1690/1974 are not Perc.
  --user NAME.RIG    Perccent identity. Payouts are PERC.
  --threads N        CPU workers (default 1, max 64)
  --notls            plain TCP instead of TLS
  --leaves N         Wagner leaf window (default 131072)
  --print-config     print parsed settings as JSON and exit
  --help             this text

Needs Node.js 18+. Linked stratum: https://github.com/rgsneddon/perc-stratum-pool
`;

function flag(argv, name, fallback) {
  const i = argv.indexOf(name);
  if (i >= 0 && argv[i + 1]) return argv[i + 1];
  return fallback;
}

export function honorThreads(raw) {
  const n = Math.max(1, Math.min(64, Math.floor(Number(raw) || 1)));
  return {
    threads: n,
    nonceStride: n,
    starts: Array.from({ length: n }, (_, slot) => 1 + slot),
  };
}

export function parseMinerArgs(argv = process.argv) {
  const pool = flag(argv, '--pool', 'mineperc.restoreprivacy.online:1466');
  const user = flag(argv, '--user', 'PERC_USERNAME.WORKER');
  const useTls = !argv.includes('--notls');
  const leaves = Number(flag(argv, '--leaves', '131072'));
  const threadsPlan = honorThreads(flag(argv, '--threads', '1'));
  const [host, portStr] = String(pool).split(':');
  const port = Number(portStr || 1466);
  return {
    pool,
    user,
    useTls,
    leaves,
    host,
    port,
    ...threadsPlan,
  };
}

export function asPreWork(job) {
  const raw = job?.input || job?.preWork;
  if (typeof raw === 'string' && raw.length >= 64) return raw.slice(0, 64);
  return defaultPreWork(job?.height || 0);
}

function send(sock, obj) {
  sock.write(`${JSON.stringify(obj)}\n`);
}

export function main(argv = process.argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(HELP);
    return 0;
  }
  const cfg = parseMinerArgs(argv);
  if (argv.includes('--print-config')) {
    process.stdout.write(`${JSON.stringify(cfg)}\n`);
    return 0;
  }
  if (cfg.port === 1690 || cfg.port === 1974) {
    console.error('ports 1690/1974 are Beam. Perc uses 1466 (normal) or 3334 (high-diff).');
    return 2;
  }

  const { host, port, useTls, user, leaves, threads, nonceStride, starts } = cfg;
  console.log(
    `perc-mine ${VERSION} BeamHash III CPU ×${threads} → ${useTls ? 'ssl' : 'tcp'}://${host}:${port} user=${user}`,
  );

  const sock = useTls
    ? tls.connect({ host, port, rejectUnauthorized: false, requestCert: false })
    : net.connect(port, host);

  let buf = '';
  let job = null;
  let hashes = 0;
  let running = false;

  sock.setEncoding('utf8');
  const hello = () => {
    send(sock, {
      method: 'login',
      api_key: user,
      id: 'login',
      jsonrpc: '2.0',
    });
  };
  sock.on('secureConnect', hello);
  sock.on('connect', () => {
    if (!useTls) hello();
  });
  sock.on('error', (e) => {
    console.error('socket', e.message);
    process.exitCode = 1;
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
        console.log(
          `job ${job.jobId || job.id} height=${job.height} algo=${job.algorithm || 'beamhashIII'} threads=${threads}`,
        );
        if (!running) mine();
      } else if (msg.description) {
        console.log('pool:', msg.description, msg.nonceprefix || msg.code || '', msg.asset || '');
      }
    }
  });

  async function mineSlot(startNonce) {
    let nonce = startNonce;
    while (job) {
      const pre = asPreWork(job);
      const nonce8 = hex8(nonce);
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
          console.log('submitted solution hashes~', hashes, 'thread-start', startNonce);
        }
      }
      if (nonce % (8 * nonceStride) === startNonce % (8 * nonceStride)) {
        console.log('searching… hashes~', hashes, 'nonce', nonce, 'threads', threads);
      }
      nonce += nonceStride;
      await new Promise((r) => setImmediate(r));
    }
  }

  async function mine() {
    running = true;
    await Promise.all(starts.map((start) => mineSlot(start)));
  }

  return { sock, cfg };
}

if (isMainModule(import.meta.url, process.argv[1])) {
  const code = main(process.argv);
  if (typeof code === 'number') process.exit(code);
}
