#!/bin/sh
# Render the Big-O mascot SVG into the PNG sizes Chrome needs for the toolbar and extensions page.
# Requires rsvg-convert (brew install librsvg). Run from frontend/: sh scripts/icons.sh
set -e
cd "$(dirname "$0")/.."
for size in 16 32 48 128; do
  rsvg-convert -w "$size" -h "$size" public/icons/big-o.svg -o "public/icons/icon-$size.png"
done
cp public/icons/big-o.svg public/favicon.svg
