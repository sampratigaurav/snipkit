// SnipKit - scripts/generate-icons.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const icons = [
  { svg: path.join(root, 'icons/icon16.svg'),  png: path.join(root, 'icons/icon16.png'),  size: 16  },
  { svg: path.join(root, 'icons/icon48.svg'),  png: path.join(root, 'icons/icon48.png'),  size: 48  },
  { svg: path.join(root, 'icons/icon128.svg'), png: path.join(root, 'icons/icon128.png'), size: 128 }
];

async function generate() {
  for (const icon of icons) {
    const svgBuffer = fs.readFileSync(icon.svg);
    await sharp(svgBuffer)
      .resize(icon.size, icon.size)
      .png()
      .toFile(icon.png);
    console.log('Generated:', path.relative(root, icon.png));
  }
  console.log('Done.');
}

generate().catch(console.error);
