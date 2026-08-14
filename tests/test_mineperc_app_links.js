import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHIPPED = path.join(root, 'website', 'index.html');

const REQUIRED = [
  ['perccent-wallet Windows', 'https://github.com/rgsneddon/perccent-wallet/releases/download/v1.1.6/perccent-wallet-v1.1.6-windows-x64-setup.exe'],
  ['perccent-wallet Android', 'https://github.com/rgsneddon/perccent-wallet/releases/download/v1.1.6/perccent-wallet-v1.1.6-android-setup.apk'],
  ['perccent-wallet macOS', 'https://github.com/rgsneddon/perccent-wallet/releases/download/v1.1.7/perccent-wallet-v1.1.7-macos-setup.zip'],
  ['perccent-wallet iOS', 'https://github.com/rgsneddon/perccent-wallet/releases/download/v1.1.7/perccent-wallet-v1.1.7-ios-setup.ipa'],
  ['perc-mine Windows', 'https://github.com/rgsneddon/perc-mine/releases/download/v1.0.2/perc-mine-1.0.2-windows.zip'],
  ['perc-mine Linux', 'https://github.com/rgsneddon/perc-mine/releases/download/v1.0.2/perc-mine-1.0.2-linux.tar.gz'],
  ['perc-mine macOS', 'https://github.com/rgsneddon/perc-mine/releases/download/v1.0.2/perc-mine-1.0.2-macos.tar.gz'],
];

function anchors(html) {
  return [...html.matchAll(/<a href="([^"]+)">([^<]*)<\/a>/g)].map((m) => ({
    href: m[1],
    label: m[2].replace(/\s+/g, ' ').trim(),
  }));
}

test('shipped mineperc page links wallet, CPU miner, and per-platform installers', () => {
  const html = readFileSync(SHIPPED, 'utf8');
  assert.equal(/beam/i.test(html), false, 'page must not mention Beam');
  assert.match(html, /1466/);
  assert.match(html, /3334/);
  assert.match(html, /id="mineperc-apps"/);
  const found = anchors(html);
  for (const [label, href] of REQUIRED) {
    const hit = found.find((a) => a.href === href && a.label === label);
    assert.ok(hit, `missing ${label} -> ${href}`);
  }
  const hrefs = found.map((a) => a.href);
  assert.ok(hrefs.includes('https://github.com/rgsneddon/perccent-wallet'));
  assert.ok(hrefs.includes('https://github.com/rgsneddon/perc-mine'));
  assert.ok(hrefs.includes('https://github.com/rgsneddon/perc-stratum-pool'));
  assert.ok(hrefs.includes('https://evolve.restoreprivacy.online/'));
});
