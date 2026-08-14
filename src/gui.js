#!/usr/bin/env node
/**
 * perc-mine GUI — threads, miner config command, Connect starts the miner.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildMinerCommand, defaultGuiSettings, startMinerFromGui } from './gui_launch.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PAGE = path.join(here, 'gui.html');
const PORT = Number(process.env.PERC_MINE_GUI_PORT || 18765);

let child = null;
const lines = ['Ready.'];

function pushLine(s) {
  const text = String(s || '').replace(/\n+$/, '');
  if (!text) return;
  for (const line of text.split('\n')) {
    lines.push(line);
    if (lines.length > 400) lines.shift();
  }
}

function stopMiner() {
  if (child && !child.killed) {
    child.kill('SIGTERM');
  }
  child = null;
}

export function createGuiServer({ port = PORT } = {}) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(PAGE));
      return;
    }
    if (url.pathname === '/api/command') {
      const settings = {
        pool: url.searchParams.get('pool') || defaultGuiSettings().pool,
        user: url.searchParams.get('user') || defaultGuiSettings().user,
        threads: url.searchParams.get('threads') || defaultGuiSettings().threads,
        notls: url.searchParams.get('notls') === '1',
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(buildMinerCommand(settings)));
      return;
    }
    if (url.pathname === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ running: Boolean(child), lines }));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/stop') {
      stopMiner();
      pushLine('stopped');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ stopped: true }));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/connect') {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        let body = {};
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        } catch {
          body = {};
        }
        stopMiner();
        const started = startMinerFromGui({
          pool: body.pool,
          user: body.user,
          threads: body.threads,
          notls: Boolean(body.notls),
        });
        child = started.child;
        pushLine(`Connect → ${started.cmd.argvText}`);
        child.stdout?.on('data', (d) => pushLine(d.toString('utf8')));
        child.stderr?.on('data', (d) => pushLine(d.toString('utf8')));
        child.on('exit', (code) => {
          pushLine(`miner exit ${code}`);
          child = null;
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ started: true, cmd: started.cmd }));
      });
      return;
    }
    res.writeHead(404);
    res.end('not found');
  });
  return {
    listen: (cb) => server.listen(port, '127.0.0.1', cb),
    close: () =>
      new Promise((resolve) => {
        stopMiner();
        server.close(resolve);
      }),
    address: () => server.address(),
    server,
  };
}

function openBrowser(url) {
  const plat = process.platform;
  if (plat === 'darwin') exec(`open "${url}"`);
  else if (plat === 'win32') exec(`start "" "${url}"`);
  else exec(`xdg-open "${url}"`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const srv = createGuiServer({ port: PORT });
  srv.listen(() => {
    const url = `http://127.0.0.1:${PORT}/`;
    console.log(`perc-mine GUI ${url}`);
    openBrowser(url);
  });
}
