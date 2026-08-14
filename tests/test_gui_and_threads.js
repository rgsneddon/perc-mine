import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { honorThreads, parseMinerArgs } from '../src/miner.js';
import { buildMinerCommand, startMinerFromGui } from '../src/gui_launch.js';
import { createGuiServer } from '../src/gui.js';
import { isMainModule } from '../src/is_main.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('isMainModule accepts Windows backslash argv that file://${argv} misses', () => {
  const winArgv = 'C:\\Users\\miner\\perc-mine\\src\\miner.js';
  const winHref = pathToFileURL(winArgv).href;
  assert.equal(isMainModule(winHref, winArgv), true);
  assert.notEqual(winHref, `file://${winArgv}`);
  assert.equal(isMainModule(winHref, 'C:\\Users\\miner\\perc-mine\\src\\gui.js'), false);
  const posix = '/Users/miner/perc-mine/src/gui.js';
  assert.equal(isMainModule(pathToFileURL(posix).href, posix), true);
  const minerSrc = readFileSync(path.join(root, 'src/miner.js'), 'utf8');
  const guiSrc = readFileSync(path.join(root, 'src/gui.js'), 'utf8');
  assert.match(minerSrc, /isMainModule/);
  assert.match(guiSrc, /isMainModule/);
  assert.doesNotMatch(minerSrc, /file:\$\{process\.argv\[1\]\}/);
  assert.doesNotMatch(guiSrc, /file:\$\{process\.argv\[1\]\}/);
});

test('honorThreads and --threads are applied by the shipped miner', () => {
  const plan = honorThreads(4);
  assert.equal(plan.threads, 4);
  assert.equal(plan.nonceStride, 4);
  assert.deepEqual(plan.starts, [1, 2, 3, 4]);
  assert.equal(plan.starts.length, 4);
  const parsed = parseMinerArgs(['node', 'miner.js', '--threads', '6', '--user', 'alice.rig']);
  assert.equal(parsed.threads, 6);
  assert.equal(parsed.nonceStride, 6);
  assert.equal(parsed.starts.length, 6);
  assert.equal(parsed.user, 'alice.rig');
  const printed = spawnSync(process.execPath, ['src/miner.js', '--print-config', '--threads', '5'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(printed.status, 0);
  const cfg = JSON.parse(printed.stdout);
  assert.equal(cfg.threads, 5);
  assert.equal(cfg.nonceStride, 5);
});

test('GUI builder command is what Connect launches and what miner honors', () => {
  const cmd = buildMinerCommand({
    pool: 'mineperc.restoreprivacy.online:1466',
    user: 'perc_user.gpu0',
    threads: 3,
  });
  assert.match(cmd.argvText, /--threads 3/);
  assert.match(cmd.argvText, /--user perc_user.gpu0/);
  assert.equal(cmd.threads, 3);
  const printed = spawnSync(cmd.exe, [...cmd.args, '--print-config'], { encoding: 'utf8' });
  assert.equal(printed.status, 0, printed.stderr);
  const cfg = JSON.parse(printed.stdout);
  assert.equal(cfg.threads, 3);
  assert.equal(cfg.user, 'perc_user.gpu0');
  let seen;
  const fake = startMinerFromGui(
    { pool: '127.0.0.1:9', user: 'bob.w', threads: 7, notls: true },
    (exe, args) => {
      seen = { exe, args };
      return { stdout: { on() {} }, stderr: { on() {} }, on() {}, kill() {}, killed: true };
    },
  );
  assert.equal(seen.exe, cmd.exe);
  assert.ok(seen.args.includes('--threads'));
  assert.equal(seen.args[seen.args.indexOf('--threads') + 1], '7');
  assert.equal(seen.cmd || seen.args.includes('--notls'), true);
  assert.equal(fake.cmd.threads, 7);
});

test('absolute miner.js entry prints config (Connect spawn path)', () => {
  const minerPath = path.join(root, 'src', 'miner.js');
  const printed = spawnSync(process.execPath, [minerPath, '--print-config', '--threads', '8'], {
    encoding: 'utf8',
  });
  assert.equal(printed.status, 0, printed.stderr);
  assert.equal(JSON.parse(printed.stdout).threads, 8);
});

test('gui.js as process entry listens', async () => {
  const port = 18776;
  const child = spawn(process.execPath, [path.join(root, 'src', 'gui.js')], {
    env: { ...process.env, PERC_MINE_GUI_PORT: String(port), PERC_MINE_GUI_HTTP: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let buf = '';
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`gui no listen: ${buf}`)), 5000);
    const on = (c) => {
      buf += c.toString('utf8');
      if (/perc-mine GUI/.test(buf)) {
        clearTimeout(t);
        resolve();
      }
    };
    child.stdout.on('data', on);
    child.stderr.on('data', on);
    child.on('error', reject);
  });
  const html = await fetch(`http://127.0.0.1:${port}/`).then((r) => r.text());
  assert.match(html, />Connect</);
  child.kill('SIGTERM');
});

test('GUI HTML has threads, miner config command, and Connect', () => {
  const html = readFileSync(path.join(root, 'src/gui.html'), 'utf8');
  assert.match(html, /id="threads"/);
  assert.match(html, /id="command"/);
  assert.match(html, />Connect</);
  assert.match(html, /Miner config command/);
  assert.match(html, /location\.protocol === 'file:'/);
  assert.match(html, /perc-mine-gui/);
  assert.match(html, /\/api\/connect/);
});

test('GUI /api/connect starts the shipped miner command', async () => {
  const srv = createGuiServer({ port: 0 });
  await new Promise((r) => srv.listen(r));
  const { port } = srv.address();
  const cmd = await fetch(`http://127.0.0.1:${port}/api/command?threads=2&user=gui.w`).then((r) =>
    r.json(),
  );
  assert.equal(cmd.threads, 2);
  assert.match(cmd.argvText, /--threads 2/);
  const started = await fetch(`http://127.0.0.1:${port}/api/connect`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      pool: 'mineperc.restoreprivacy.online:1466',
      user: 'gui.w',
      threads: 2,
    }),
  }).then((r) => r.json());
  assert.equal(started.started, true);
  assert.equal(started.cmd.threads, 2);
  await srv.close();
});

function waitForJob(child, ms = 10000) {
  return new Promise((resolve, reject) => {
    let buf = '';
    const t = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`timeout: ${buf}`));
    }, ms);
    const onData = (c) => {
      buf += c.toString('utf8');
      if (/job |Login Successful|pool: Login Successful/.test(buf)) {
        clearTimeout(t);
        child.kill('SIGTERM');
        resolve(buf);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', (e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

test('Connect path / miner login+job twice', async () => {
  const logs = [];
  for (let i = 0; i < 2; i++) {
    const cmd = buildMinerCommand({
      pool: 'mineperc.restoreprivacy.online:1466',
      user: 'perc_user.gpu0',
      threads: 2,
    });
    const child = spawn(cmd.exe, cmd.args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const out = await waitForJob(child);
    logs.push(out);
    assert.match(out, /job |Login Successful|pool:/);
  }
  assert.equal(logs.length, 2);
});
