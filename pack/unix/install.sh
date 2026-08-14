#!/usr/bin/env bash
# perc-mine Linux / macOS installer — Node.js 18+ CPU miner for Perccent (PERC).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
if [[ ! -f "$ROOT/src/miner.js" ]]; then
  ROOT="$(cd "$HERE/.." && pwd)"
fi
BIN="${PREFIX:-$HOME/.local/perc-mine}"
mkdir -p "$BIN"
cp -R "$ROOT/src" "$BIN/src"
cp "$HERE/perc-mine" "$BIN/perc-mine"
chmod +x "$BIN/perc-mine"
LINK_DIR="${PREFIX_BIN:-$HOME/.local/bin}"
mkdir -p "$LINK_DIR"
ln -sfn "$BIN/perc-mine" "$LINK_DIR/perc-mine"
echo "Installed perc-mine to $BIN"
echo "Add $LINK_DIR to PATH if needed, then:"
echo "  perc-mine --pool mineperc.restoreprivacy.online:1466 --user YOUR_PERC_NAME.worker1"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18+ is required. Install from https://nodejs.org/" >&2
fi
