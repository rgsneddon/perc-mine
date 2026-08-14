/**
 * GUI command builder + Connect launcher.
 * Connect starts the shipped miner with the same args the config command shows.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { honorThreads, VERSION } from './miner.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export function defaultGuiSettings() {
  return {
    pool: 'mineperc.restoreprivacy.online:1466',
    user: 'PERC_USERNAME.WORKER',
    threads: Math.max(1, Math.min(8, os.cpus()?.length || 1)),
    notls: false,
  };
}

export function buildMinerCommand({
  pool,
  user,
  threads,
  notls = false,
  nodeBin = process.execPath,
  minerPath = path.join(here, 'miner.js'),
} = {}) {
  const plan = honorThreads(threads);
  const args = [
    minerPath,
    '--pool',
    String(pool || 'mineperc.restoreprivacy.online:1466'),
    '--user',
    String(user || 'PERC_USERNAME.WORKER'),
    '--threads',
    String(plan.threads),
  ];
  if (notls) args.push('--notls');
  const argvText = [nodeBin, ...args]
    .map((p) => (/\s/.test(p) ? `"${p}"` : p))
    .join(' ');
  return {
    exe: nodeBin,
    args,
    argvText,
    threads: plan.threads,
    version: VERSION,
  };
}

export function startMinerFromGui(settings, spawnFn = spawn) {
  const cmd = buildMinerCommand(settings);
  try {
    const child = spawnFn(cmd.exe, cmd.args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { child, cmd, ok: true };
  } catch (err) {
    return { child: null, cmd, ok: false, error: err.message || String(err) };
  }
}
