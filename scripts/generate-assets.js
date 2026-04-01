// scripts/generate-assets.js
// Generates pixel-perfect Chrome Web Store PNGs from SVG.
// All outputs: 24-bit PNG, no alpha channel.
// Run: node scripts/generate-assets.js

'use strict';

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const BG = { r: 13, g: 13, b: 11 }; // #0d0d0b

// Backslash in SVG text must be written as a plain character inside XML CDATA-style
// strings — here we build SVG via string concatenation so no template-literal
// escape ambiguity can occur.

// ── Shared colour tokens ─────────────────────────────────────────────────────
const C = {
  bg:     '#0d0d0b',
  bg2:    '#111110',
  bg3:    '#0a0a08',
  bgG:    '#0c130f',
  border: 'rgba(255,255,255,0.07)',
  green:  '#1D9E75',
  greenL: '#5DCAA5',
  greenD: '#0f2720',
  text:   '#e8e6df',
  textD:  '#c8c6bf',
  muted:  '#7a7870',
  subtle: '#4a4844',
  v:      'monospace',
  s:      'Arial,Helvetica,sans-serif',
  se:     "Georgia,'Times New Roman',serif",
};

// Helper: pill shape + label
function pill(x, y, w, label) {
  return `<rect x="${x}" y="${y}" width="${w}" height="24" rx="5" fill="${C.greenD}" stroke="${C.green}" stroke-width="0.8" stroke-opacity="0.45"/>` +
         `<text x="${x + w / 2}" y="${y + 16}" font-family="${C.v}" font-size="11" font-weight="700" fill="${C.greenL}" text-anchor="middle">${label}</text>`;
}

function pillL(x, y, w, label) {
  return `<rect x="${x}" y="${y}" width="${w}" height="30" rx="6" fill="${C.greenD}" stroke="${C.green}" stroke-width="0.9" stroke-opacity="0.45"/>` +
         `<text x="${x + w / 2}" y="${y + 20}" font-family="${C.v}" font-size="13" font-weight="700" fill="${C.greenL}" text-anchor="middle">${label}</text>`;
}

// ── ASSET 1: Promo tile 440×280 ──────────────────────────────────────────────
function buildPromo() {
  const bs = '\\';   // literal backslash character for SVG text content
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280">`,
    `<defs><radialGradient id="g" cx="50%" cy="48%" r="52%">`,
    `<stop offset="0%" stop-color="${C.green}" stop-opacity="0.09"/>`,
    `<stop offset="100%" stop-color="${C.bg}" stop-opacity="0"/>`,
    `</radialGradient></defs>`,
    `<rect width="440" height="280" fill="${C.bg}"/>`,
    `<rect width="440" height="280" fill="url(#g)"/>`,
    // Top accent
    `<rect x="110" y="0" width="220" height="1.5" fill="${C.green}" opacity="0.35"/>`,
    // Wordmark
    `<circle cx="24" cy="22" r="4.5" fill="${C.green}"/>`,
    `<text x="36" y="27" font-family="${C.v}" font-size="13" font-weight="500" fill="${C.text}">SnipKit</text>`,
    // Tagline — white part
    `<text x="116" y="120" font-family="${C.se}" font-size="38" fill="${C.text}" font-style="italic">Type ${bs}&#160;&#160;</text>`,
    // Tagline — green part
    `<text x="248" y="120" font-family="${C.se}" font-size="38" fill="${C.green}" font-style="italic">expand.</text>`,
    // Pills
    pill( 84, 148,  68, bs + 'stack'),
    pill(164, 148,  54, bs + 'usn'),
    pill(230, 148,  62, bs + 'intro'),
    pill(304, 148,  54, bs + 'repo'),
    // Bottom label
    `<text x="420" y="262" font-family="${C.v}" font-size="10" fill="${C.subtle}" text-anchor="end">Chrome Extension · Free · Open Source</text>`,
    // Bottom bar
    `<rect x="0" y="275" width="440" height="5" fill="${C.green}" opacity="0.35"/>`,
    `</svg>`,
  ].join('\n');
}

// ── ASSET 2: Screenshot 1280×800 ─────────────────────────────────────────────
function buildScreenshot() {
  const bs = '\\';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800">`,
    // BG
    `<rect width="1280" height="800" fill="${C.bg}"/>`,
    // Top banner
    `<rect x="0" y="0" width="1280" height="118" fill="${C.bg3}"/>`,
    `<rect x="0" y="118" width="1280" height="1" fill="rgba(255,255,255,0.06)"/>`,
    `<text x="640" y="58" font-family="${C.se}" font-size="40" fill="${C.text}" text-anchor="middle" font-style="italic">Stop copy-pasting. Start shipping.</text>`,
    `<text x="640" y="96" font-family="${C.s}" font-size="14" fill="${C.subtle}" text-anchor="middle">SnipKit &#8212; keyboard-driven text expansion for developers</text>`,
    // Divider
    `<line x1="640" y1="130" x2="640" y2="735" stroke="${C.green}" stroke-width="0.6" stroke-opacity="0.22"/>`,

    // === LEFT: BEFORE ===
    `<text x="320" y="155" font-family="${C.v}" font-size="10" fill="${C.subtle}" text-anchor="middle" letter-spacing="2">BEFORE SNIPKIT</text>`,
    // Card
    `<rect x="72" y="170" width="496" height="335" rx="10" fill="${C.bg2}" stroke="${C.border}" stroke-width="1"/>`,
    `<text x="320" y="200" font-family="${C.s}" font-size="13" font-weight="600" fill="${C.textD}" text-anchor="middle">Hackathon Registration &#8212; DevFest 2025</text>`,
    // Field 1 before
    `<text x="100" y="242" font-family="${C.v}" font-size="9" fill="${C.subtle}">TECH STACK USED</text>`,
    `<rect x="100" y="250" width="440" height="36" rx="5" fill="#181816" stroke="${C.border}" stroke-width="1"/>`,
    `<text x="114" y="273" font-family="${C.v}" font-size="11" fill="${C.muted}">React, Node... (need to check notes app)</text>`,
    // Floating chaos note
    `<rect x="390" y="256" width="142" height="70" rx="6" fill="#1a1816" stroke="rgba(255,200,80,0.1)" stroke-width="1" transform="rotate(2,461,291)"/>`,
    `<text x="398" y="275" font-family="${C.v}" font-size="9" fill="${C.subtle}" transform="rotate(2,461,291)">&#128203; snippets.txt</text>`,
    `<text x="398" y="291" font-family="${C.v}" font-size="9" fill="#3a3835" transform="rotate(2,461,291)">React, Node, TS&#8230;</text>`,
    `<text x="398" y="306" font-family="${C.v}" font-size="9" fill="#3a3835" transform="rotate(2,461,291)">1DS22094 &#8592; wrong?</text>`,
    `<text x="398" y="321" font-family="${C.v}" font-size="9" fill="#3a3835" transform="rotate(2,461,291)">updated: last week?</text>`,
    // Field 2 before
    `<text x="100" y="316" font-family="${C.v}" font-size="9" fill="${C.subtle}">UNIVERSITY ID</text>`,
    `<rect x="100" y="324" width="440" height="36" rx="5" fill="#181816" stroke="${C.border}" stroke-width="1"/>`,
    `<text x="114" y="347" font-family="${C.v}" font-size="11" fill="${C.muted}">1DS22CS... (where did I write this?)</text>`,
    // Field 3 before
    `<text x="100" y="390" font-family="${C.v}" font-size="9" fill="${C.subtle}">PORTFOLIO LINK</text>`,
    `<rect x="100" y="398" width="440" height="36" rx="5" fill="#181816" stroke="${C.border}" stroke-width="1"/>`,
    `<text x="114" y="421" font-family="${C.v}" font-size="11" fill="${C.muted}">github.com/... (switching tabs again)</text>`,
    // Before caption
    `<text x="320" y="535" font-family="${C.s}" font-size="13" fill="#3a3835" text-anchor="middle">Copy. Switch tab. Paste. Repeat. Every. Single. Form.</text>`,

    // === RIGHT: AFTER ===
    `<text x="960" y="155" font-family="${C.v}" font-size="10" fill="${C.green}" text-anchor="middle" letter-spacing="2">WITH SNIPKIT</text>`,
    // Card
    `<rect x="712" y="170" width="496" height="335" rx="10" fill="${C.bgG}" stroke="rgba(29,158,117,0.18)" stroke-width="1"/>`,
    `<text x="960" y="200" font-family="${C.s}" font-size="13" font-weight="600" fill="${C.textD}" text-anchor="middle">Hackathon Registration &#8212; DevFest 2025</text>`,
    // Field 1 after
    `<text x="740" y="242" font-family="${C.v}" font-size="9" fill="#2a6a50">TECH STACK USED</text>`,
    `<rect x="740" y="250" width="440" height="36" rx="5" fill="#0c1a14" stroke="rgba(29,158,117,0.25)" stroke-width="1"/>`,
    `<text x="754" y="273" font-family="${C.v}" font-size="11" fill="${C.green}">React &#183; TypeScript &#183; Node.js &#183; Socket.io &#183; PostgreSQL</text>`,
    // Field 2 after
    `<text x="740" y="316" font-family="${C.v}" font-size="9" fill="#2a6a50">UNIVERSITY ID</text>`,
    `<rect x="740" y="324" width="440" height="36" rx="5" fill="#0c1a14" stroke="rgba(29,158,117,0.25)" stroke-width="1"/>`,
    `<text x="754" y="347" font-family="${C.v}" font-size="11" fill="${C.green}">1DS22CS094 &#8212; Samprati Gaurav, DSU</text>`,
    // Field 3 after
    `<text x="740" y="390" font-family="${C.v}" font-size="9" fill="#2a6a50">PORTFOLIO LINK</text>`,
    `<rect x="740" y="398" width="440" height="36" rx="5" fill="#0c1a14" stroke="rgba(29,158,117,0.25)" stroke-width="1"/>`,
    `<text x="754" y="421" font-family="${C.v}" font-size="11" fill="${C.green}">https://github.com/sampratigaurav</text>`,
    // Toast
    `<rect x="790" y="464" width="290" height="34" rx="8" fill="#111110" stroke="rgba(29,158,117,0.4)" stroke-width="1"/>`,
    `<text x="935" y="486" font-family="${C.s}" font-size="13" fill="${C.green}" text-anchor="middle">&#10003; Expanded: ${bs}stack</text>`,
    // After caption
    `<text x="960" y="540" font-family="${C.s}" font-size="14" fill="${C.green}" text-anchor="middle" font-weight="600">Type ${bs}stack. Done. Move on.</text>`,

    // Bottom feature strip
    `<rect x="0" y="735" width="1280" height="65" fill="${C.bg3}"/>`,
    `<rect x="0" y="735" width="1280" height="1" fill="rgba(255,255,255,0.05)"/>`,
    `<text x="213" y="773" font-family="${C.s}" font-size="14" fill="${C.textD}" text-anchor="middle">&#9889;  Instant expansion</text>`,
    `<text x="640" y="773" font-family="${C.s}" font-size="14" fill="${C.textD}" text-anchor="middle">&#128274;  100% local &#183; zero servers</text>`,
    `<text x="1067" y="773" font-family="${C.s}" font-size="14" fill="${C.textD}" text-anchor="middle">&#9000;  Works on every website</text>`,
    `<line x1="427" y1="752" x2="427" y2="792" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`,
    `<line x1="854" y1="752" x2="854" y2="792" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`,
    `</svg>`,
  ].join('\n');
}

// ── ASSET 3: Marquee promo tile 1400×560 ─────────────────────────────────────
function buildMarquee() {
  const bs = '\\';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="560">`,
    `<defs><radialGradient id="mg" cx="50%" cy="46%" r="58%">`,
    `<stop offset="0%" stop-color="${C.green}" stop-opacity="0.08"/>`,
    `<stop offset="100%" stop-color="${C.bg}" stop-opacity="0"/>`,
    `</radialGradient></defs>`,
    `<rect width="1400" height="560" fill="${C.bg}"/>`,
    `<rect width="1400" height="560" fill="url(#mg)"/>`,
    `<rect x="350" y="0" width="700" height="2" fill="${C.green}" opacity="0.3"/>`,
    // Wordmark
    `<circle cx="70" cy="56" r="6" fill="${C.green}"/>`,
    `<text x="88" y="63" font-family="${C.v}" font-size="17" font-weight="500" fill="${C.text}">SnipKit</text>`,
    // Headlines
    `<text x="700" y="218" font-family="${C.se}" font-size="72" fill="${C.text}" text-anchor="middle" font-style="italic">Stop copy-pasting.</text>`,
    `<text x="700" y="305" font-family="${C.se}" font-size="72" fill="${C.green}" text-anchor="middle" font-style="italic">Start typing.</text>`,
    `<text x="700" y="360" font-family="${C.s}" font-size="17" fill="${C.subtle}" text-anchor="middle">Keyboard-driven text expansion for developers &#183; Free Chrome Extension</text>`,
    // Pills
    pillL(425, 393, 78, bs + 'stack'),
    pillL(515, 393, 62, bs + 'usn'),
    pillL(589, 393, 70, bs + 'intro'),
    pillL(671, 393, 64, bs + 'repo'),
    pillL(747, 393, 50, bs + 'pr'),
    // Privacy note
    `<text x="700" y="474" font-family="${C.v}" font-size="11" fill="#2a2a28" text-anchor="middle">// No account &#183; No tracking &#183; chrome.storage.local only</text>`,
    // Bottom bar
    `<rect x="0" y="550" width="1400" height="10" fill="${C.green}" opacity="0.28"/>`,
    `</svg>`,
  ].join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync('store')) fs.mkdirSync('store');

  const assets = [
    { file: 'store/promo-tile-final.png', svg: buildPromo(),      w: 440,  h: 280 },
    { file: 'store/screenshot-final.png', svg: buildScreenshot(), w: 1280, h: 800 },
    { file: 'store/marquee-final.png',    svg: buildMarquee(),    w: 1400, h: 560 },
  ];

  for (const { file, svg, w, h } of assets) {
    await sharp(Buffer.from(svg))
      .resize(w, h)
      .flatten({ background: BG })
      .png({ compressionLevel: 9 })
      .toFile(file);

    const kb = (fs.statSync(file).size / 1024).toFixed(1);
    console.log(`✓  ${file}  (${w}x${h})  ${kb} KB`);
  }

  console.log('\n✅  All store assets generated. Upload *-final.png files to CWS.');
}

main().catch(err => {
  console.error('❌ ', err.message);
  process.exit(1);
});
