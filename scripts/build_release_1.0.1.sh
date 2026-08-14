#!/usr/bin/env bash
# Build perc-mine 1.0.1 installer trees for Windows, Linux, macOS.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VER=1.0.1
OUT="$ROOT/dist"
rm -rf "$OUT"
mkdir -p "$OUT"

stage="$OUT/perc-mine-$VER"
mkdir -p "$stage"
cp -R "$ROOT/src" "$stage/src"
cp -R "$ROOT/pack" "$stage/pack"
cp "$ROOT/package.json" "$ROOT/README.md" "$ROOT/LICENSE" "$ROOT/RELEASE_NOTES.md" "$stage/"
chmod +x "$stage/pack/unix/perc-mine" "$stage/pack/unix/perc-mine-gui" "$stage/pack/unix/install.sh"

# Linux / macOS share the unix installer; separate archives as in 1.0.0
(cd "$OUT" && tar -czf "perc-mine-$VER-linux.tar.gz" "perc-mine-$VER")
(cd "$OUT" && tar -czf "perc-mine-$VER-macos.tar.gz" "perc-mine-$VER")
(cd "$OUT" && zip -qr "perc-mine-$VER-windows.zip" "perc-mine-$VER")

(cd "$OUT" && shasum -a 256 perc-mine-$VER-*.tar.gz perc-mine-$VER-windows.zip > SHA256SUMS)
ls -lh "$OUT"
cat "$OUT/SHA256SUMS"
