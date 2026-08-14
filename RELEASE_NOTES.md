# perc-mine v1.0.0

First public release of the Perccent (PERC) CPU miner and open-source pool entry.

## What this is

perc-mine is the Perccent counterpart of [beam-mine](https://github.com/rgsneddon/beam-mine). It uses the same three-repo proof-of-work architecture:

1. **perc-mine** (this repo) — CPU miner for Windows, Linux, and macOS, plus pool operator entry (`init.js`) and landing page.
2. **[perc-stratum-pool](https://github.com/rgsneddon/perc-stratum-pool)** — BeamHash III job/share verify and TLS stratum (git dependency, same pattern as beam-mine → beam-stratum-pool).
3. **[basic](https://github.com/rgsneddon/basic)** — BASiC payment processor. Accepted shares credit **PERC**, never BEAM.

Live pool: https://mineperc.restoreprivacy.online/

## Algorithm

**BeamHash III** (Trei, 2020): 448-bit work, 24-bit collisions, 5 rounds, 32×25-bit indices, 8+104 share wire. Personal string `Beam-PoW`.

Payout asset is PERC. Do not pass `--coin BEAM`. Ports `1690` and `1974` stay on the Beam pool.

## How to mine

Need [Node.js 18+](https://nodejs.org/).

Normal difficulty (default):

```text
perc-mine --pool mineperc.restoreprivacy.online:1466 --user YOUR_PERC_NAME.worker1
```

High difficulty:

```text
perc-mine --pool mineperc.restoreprivacy.online:3334 --user YOUR_PERC_NAME.worker1
```

GPU miners that already speak BeamHash III:

```text
lolMiner --algo BEAM-III --pool mineperc.restoreprivacy.online:1466 --user YOUR_PERC_NAME.worker1
miniZ --url mineperc.restoreprivacy.online:1466 --user YOUR_PERC_NAME.worker1 --algo beamhashiii
gminer --algo beamhashIII --server mineperc.restoreprivacy.online:1466 --user YOUR_PERC_NAME.worker1
```

TLS is on by default (`requestCert: false`). Add `--notls` only for a local plaintext stratum.

## Installer packages

| File | Platform |
|------|----------|
| `perc-mine-1.0.0-windows.zip` | Windows — run `pack\win\install.ps1` |
| `perc-mine-1.0.0-linux.tar.gz` | Linux — run `pack/unix/install.sh` |
| `perc-mine-1.0.0-macos.tar.gz` | macOS — run `pack/unix/install.sh` |
| Source zip / tar from this tag | `npm install && npm test` |

The CPU solver uses a 2^17 leaf window. A full 2^25 Equihash-like tree is too heavy for a laptop. Shares are uncommon on CPU; the verify path (`checkShare`) is the real BeamHash III implementation.

## Linked clone (pool operators)

```bash
git clone https://github.com/rgsneddon/perc-mine.git
git clone https://github.com/rgsneddon/perc-stratum-pool.git
git clone https://github.com/rgsneddon/basic.git
cd perc-mine && npm install && npm run pool
```

## Not included

- Beam coin payouts or SBBS addresses
- Native C++ beamhashverify (this release is pure Node)
- A claim that CPU will match a GPU BeamHash III farm
