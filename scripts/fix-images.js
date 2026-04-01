// scripts/fix-images.js
// Flatten alpha channel from PNG store assets so they are CWS-compliant
// (Chrome Web Store requires 24-bit PNG or JPEG — no alpha channel)
//
// Usage: node scripts/fix-images.js
// Output: store/screenshot-final.png, store/promo-tile-final.png

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const BG = { r: 13, g: 13, b: 11 }; // #0d0d0b — SnipKit background colour

const files = [
  'store/screenshot.png',
  'store/promo-tile.png',
];

(async () => {
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.warn(`⚠  Skipping (not found): ${file}`);
      continue;
    }

    const outFile = file.replace('.png', '-final.png');

    try {
      const { width, height } = await sharp(file).metadata();

      await sharp(file)
        .flatten({ background: BG })   // composite onto solid #0d0d0b
        .png({ compressionLevel: 9 })  // 24-bit PNG, no alpha
        .toFile(outFile);

      const sizeBefore = (fs.statSync(file).size / 1024).toFixed(1);
      const sizeAfter  = (fs.statSync(outFile).size / 1024).toFixed(1);

      console.log(`✅ ${path.basename(outFile)}  (${width}×${height})  ${sizeBefore} KB → ${sizeAfter} KB`);
    } catch (err) {
      console.error(`❌ Failed: ${file}`, err.message);
    }
  }

  console.log('\nDone. Upload *-final.png files to the Chrome Web Store.');
})();
