#!/usr/bin/env bash
# Reproducible font build (SIL OFL 1.1 fonts from github.com/google/fonts).
#   FONTTOOLS=/path/to/venv/bin scripts/fonts.sh      (needs fonttools + brotli)
# → public/fonts/lagoon-display-{900,600}.woff2, lagoon-ui.woff2, OFL-*.txt
set -euo pipefail
BIN=${FONTTOOLS:-}
OUT=public/fonts
SRC=$(mktemp -d /tmp/lb-fontsrc.XXXXXX)
RAW=https://raw.githubusercontent.com/google/fonts/main/ofl
curl -fsSL "$RAW/fraunces/Fraunces%5BSOFT,WONK,opsz,wght%5D.ttf" -o "$SRC/fraunces.ttf"
curl -fsSL "$RAW/nunito/Nunito%5Bwght%5D.ttf" -o "$SRC/nunito.ttf"
curl -fsSL "$RAW/fraunces/OFL.txt" -o "$OUT/OFL-Fraunces.txt"
curl -fsSL "$RAW/nunito/OFL.txt" -o "$OUT/OFL-Nunito.txt"
"$BIN"fonttools varLib.instancer "$SRC/fraunces.ttf" SOFT=100 WONK=0 opsz=72 wght=900 -q -o "$SRC/f900.ttf"
"$BIN"fonttools varLib.instancer "$SRC/fraunces.ttf" SOFT=100 WONK=0 opsz=24 wght=600 -q -o "$SRC/f600.ttf"
U="U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-2019,U+201C-201D,U+2022,U+2026,U+00D7,U+2192,U+2605,U+2713"
sub() { "$BIN"pyftsubset "$1" --unicodes="$U" --layout-features=kern,liga,case,tnum --name-IDs=0,1,2,13,14 --flavor=woff2 --output-file="$2"; }
sub "$SRC/f900.ttf" "$OUT/lagoon-display-900.woff2"
sub "$SRC/f600.ttf" "$OUT/lagoon-display-600.woff2"
sub "$SRC/nunito.ttf" "$OUT/lagoon-ui.woff2"
ls -l "$OUT"
