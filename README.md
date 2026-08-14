# perc-mine

Open-source **Perccent (PERC)** pool software and CPU miner.

Same architecture as [beam-mine](https://github.com/rgsneddon/beam-mine):

| Role | Beam | Perccent |
|------|------|----------|
| Pool + website + miner entry | [beam-mine](https://github.com/rgsneddon/beam-mine) | **this repo** |
| Stratum + PoW verify | [beam-stratum-pool](https://github.com/rgsneddon/beam-stratum-pool) | [perc-stratum-pool](https://github.com/rgsneddon/perc-stratum-pool) |
| Share payouts | [basic](https://github.com/rgsneddon/basic) (BASiC) | [basic](https://github.com/rgsneddon/basic) (PERC credits) |

Proof of work is **BeamHash III** (Trei 2020). Payout asset is **PERC**, not BEAM. Do not pass `--coin BEAM`.

Live pool: https://mineperc.restoreprivacy.online/

## Ports

| Port | Difficulty | Host |
|------|------------|------|
| **1466** | normal | `mineperc.restoreprivacy.online` |
| **3334** | high | `mineperc.restoreprivacy.online` |

Beam keeps `1690` / `1974` on `beam.restoreprivacy.online`.

Username: `PERC_USERNAME.WORKER`

## CPU miner (all platforms)

Needs [Node.js 18+](https://nodejs.org/).

```bash
git clone https://github.com/rgsneddon/perc-mine.git
cd perc-mine
npm install
node src/miner.js --pool mineperc.restoreprivacy.online:1466 --user YOUR_PERC_NAME.worker1
```

High-diff:

```bash
node src/miner.js --pool mineperc.restoreprivacy.online:3334 --user YOUR_PERC_NAME.worker1
```

Plain TCP (no TLS): add `--notls`.

Installer packages on [Releases](https://github.com/rgsneddon/perc-mine/releases) wrap the same script:

- Windows: `pack/win/install.ps1` then `perc-mine.cmd`
- Linux / macOS: `pack/unix/install.sh` then `perc-mine`

GPU miners that already speak BeamHash III also work:

```text
lolMiner --algo BEAM-III --pool mineperc.restoreprivacy.online:1466 --user PERC_USERNAME.WORKER
miniZ --url mineperc.restoreprivacy.online:1466 --user PERC_USERNAME.WORKER --algo beamhashiii
gminer --algo beamhashIII --server mineperc.restoreprivacy.online:1466 --user PERC_USERNAME.WORKER
```

The shipped CPU solver searches a 2^17 leaf window (full Equihash-like 2^25 is too heavy for a laptop). Shares are rare on CPU; `checkShare` is the real BeamHash III path.

## Pool operator (linked repos)

```bash
git clone https://github.com/rgsneddon/perc-mine.git
git clone https://github.com/rgsneddon/perc-stratum-pool.git
git clone https://github.com/rgsneddon/basic.git
cd perc-mine
npm install
npm run pool
```

`npm install` pulls `perc-stratum-pool` from GitHub (same pattern as beam-mine’s `stratum-pool` git dependency). BASiC is the Python payment processor — see [basic/README](https://github.com/rgsneddon/basic).

Configure TLS:

```bash
export MINEPERC_TLS_KEY=/path/to/privkey.pem
export MINEPERC_TLS_CERT=/path/to/fullchain.pem
export MINEPERC_STRATUM_PORTS=1466,3334
```

## Disclaimer

This software is offered under MIT with no warranty. You are responsible for your own pool deployment.

Explorer: https://evolve.restoreprivacy.online/
