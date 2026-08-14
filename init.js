#!/usr/bin/env node
/**
 * perc-mine pool process — loads perc-stratum-pool (git dependency),
 * the same split as beam-mine loading beam-stratum-pool.
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

async function loadStratum() {
  try {
    return await import('perc-stratum-pool');
  } catch {
    try {
      return await import('../perc-stratum-pool/lib/index.js');
    } catch {
      console.error(
        'perc-stratum-pool is missing. Clone it next to perc-mine or run npm install.\n' +
          '  git clone https://github.com/rgsneddon/perc-stratum-pool.git\n' +
          'BASiC payments: https://github.com/rgsneddon/basic',
      );
      process.exit(1);
    }
  }
}

const stratum = await loadStratum();
const cfg = require('./pool_configs/perc.json');
process.env.MINEPERC_STRATUM_PORTS =
  process.env.MINEPERC_STRATUM_PORTS || (cfg.ports || [1466, 3334]).join(',');
stratum.startPercMinePool({
  httpPort: Number(process.env.MINEPERC_HTTP_PORT || cfg.httpPort || 8011),
});
