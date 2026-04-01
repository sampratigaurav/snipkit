#!/bin/bash
# SnipKit — package for Chrome Web Store submission
set -e

echo "📦 Packaging SnipKit v1.0.0..."
rm -rf dist
mkdir -p dist

zip -r dist/snipkit-v1.0.0.zip \
  manifest.json \
  popup/ \
  content/ \
  background/ \
  shared/ \
  icons/ \
  --exclude "*.DS_Store" \
  --exclude "*node_modules*" \
  --exclude "*.map" \
  --exclude "*.zip"

echo "✅ Done: dist/snipkit-v1.0.0.zip"
ls -lh dist/
