import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

// Resvg needs static font instances for reliable weight selection. The TTFs in
// scripts/fonts are 400/700 instances derived from the bundled Outfit variable
// font (SIL OFL 1.1; see src/assets/fonts/OFL.txt).

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fontFiles = [
  resolve(root, 'scripts/fonts/outfit-400.ttf'),
  resolve(root, 'scripts/fonts/outfit-700.ttf'),
];
const outDir = resolve(root, 'public');
mkdirSync(outDir, { recursive: true });

const fontOptions = {
  font: {
    fontFiles,
    loadSystemFonts: false,
    defaultFontFamily: 'Outfit',
  },
};

function render(name, svg, width, height) {
  const resvg = new Resvg(svg, { ...fontOptions, fitTo: { mode: 'width', value: width } });
  const png = resvg.render().asPng();
  const file = resolve(outDir, name);
  writeFileSync(file, png);
  console.log(`  ${name.padEnd(22)} ${width}×${height}  ${(png.length / 1024).toFixed(1)} KB`);
}

const logoMark = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="glowA" cx="18%" cy="16%" r="80%">
      <stop offset="0" stop-color="#c9f75a" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#c9f75a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="86%" cy="82%" r="72%">
      <stop offset="0" stop-color="#8b5cf6" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#191920"/>
      <stop offset="1" stop-color="#0b0b0f"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="#08080b"/>
  <rect width="512" height="512" fill="url(#glowA)"/>
  <rect width="512" height="512" fill="url(#glowB)"/>
  <rect x="76" y="76" width="360" height="360" rx="96" fill="url(#tile)" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2"/>
  <g stroke="#d4ff7a" stroke-width="30" stroke-linecap="round">
    <path d="M146 220v72"/>
    <path d="M208 164v184"/>
    <path d="M272 118v276"/>
    <path d="M336 186v140"/>
    <path d="M396 226v60"/>
  </g>
  <circle cx="396" cy="142" r="19" fill="#8b5cf6"/>
</svg>`;

const og = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0a0d"/>
      <stop offset="0.55" stop-color="#111116"/>
      <stop offset="1" stop-color="#0a0a0e"/>
    </linearGradient>
    <radialGradient id="lime" cx="12%" cy="24%" r="62%">
      <stop offset="0" stop-color="#c9f75a" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#c9f75a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="violet" cx="82%" cy="36%" r="60%">
      <stop offset="0" stop-color="#8b5cf6" stop-opacity="0.26"/>
      <stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="mark" gradientUnits="userSpaceOnUse" x1="146" y1="118" x2="396" y2="394">
      <stop offset="0" stop-color="#dcff86"/>
      <stop offset="1" stop-color="#a8e83c"/>
    </linearGradient>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#202028"/>
      <stop offset="1" stop-color="#101015"/>
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity="0.035" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#lime)"/>
  <rect width="1200" height="630" fill="url(#violet)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>

  <rect x="80" y="66" width="52" height="52" rx="15" fill="url(#tile)" stroke="#ffffff" stroke-opacity="0.09"/>
  <g stroke="#d4ff7a" stroke-width="5" stroke-linecap="round">
    <path d="M91 88v10"/>
    <path d="M99 82v22"/>
    <path d="M107 76v34"/>
    <path d="M115 86v14"/>
    <path d="M123 89v8"/>
  </g>
  <text x="150" y="102" font-family="Outfit" font-size="31" font-weight="600" fill="#f4f4f5">MusViz</text>

  <text x="80" y="288" font-family="Outfit" font-size="92" font-weight="700" letter-spacing="-3" fill="#f7f7f8">Your music,</text>
  <text x="80" y="382" font-family="Outfit" font-size="92" font-weight="700" letter-spacing="-3" fill="#f7f7f8">in <tspan fill="#c9f75a">motion.</tspan></text>

  <text x="82" y="446" font-family="Outfit" font-size="23" font-weight="400" fill="#b6b6c2">Five reactive scenes. Four image presets. Six themes.</text>
  <text x="82" y="480" font-family="Outfit" font-size="23" font-weight="400" fill="#b6b6c2">Export up to 4K at 60fps — no uploads, no account.</text>

  <g transform="translate(960 330)">
    <g stroke="#c9f75a" stroke-opacity="0.9" stroke-linecap="round">
      <path d="M0 -184v-15" stroke-width="3"/>
      <path d="M94 -158l8 -13" stroke-width="3"/>
      <path d="M158 -94l13 -8" stroke-width="3"/>
      <path d="M184 0h15" stroke-width="3" stroke="#8b5cf6" stroke-opacity="0.9"/>
      <path d="M158 94l13 8" stroke-width="3" stroke="#8b5cf6" stroke-opacity="0.85"/>
      <path d="M94 158l8 13" stroke-width="3" stroke="#8b5cf6" stroke-opacity="0.8"/>
      <path d="M0 184v15" stroke-width="3" stroke="#8b5cf6" stroke-opacity="0.75"/>
      <path d="M-94 158l-8 13" stroke-width="3" stroke="#8b5cf6" stroke-opacity="0.7"/>
      <path d="M-158 94l-13 8" stroke-width="3" stroke="#8b5cf6" stroke-opacity="0.65"/>
      <path d="M-184 0h-15" stroke-width="3" stroke="#8b5cf6" stroke-opacity="0.6"/>
      <path d="M-158 -94l-13 -8" stroke-width="3" stroke="#8b5cf6" stroke-opacity="0.55"/>
      <path d="M-94 -158l-8 -13" stroke-width="3" stroke="#c9f75a" stroke-opacity="0.7"/>
    </g>
    <circle r="163" fill="none" stroke="#ffffff" stroke-opacity="0.07" stroke-width="1"/>
    <circle r="150" fill="none" stroke="#c9f75a" stroke-opacity="0.10" stroke-width="1"/>
    <circle r="136" fill="url(#tile)" stroke="#ffffff" stroke-opacity="0.10"/>
    <circle r="135" fill="none" stroke="#8b5cf6" stroke-opacity="0.16"/>
    <g stroke="#d4ff7a" stroke-width="9" stroke-linecap="round">
      <path d="M-54 26v-52"/>
      <path d="M-28 -8v56"/>
      <path d="M0 -36v82"/>
      <path d="M28 -12v50"/>
      <path d="M54 20v-34"/>
    </g>
    <circle cx="54" cy="-48" r="8" fill="#8b5cf6"/>
  </g>

  <line x1="80" y1="548" x2="1120" y2="548" stroke="#ffffff" stroke-opacity="0.08"/>
  <g fill="#878792">
    <circle cx="86" cy="576" r="7" fill="none" stroke="#878792" stroke-opacity="0.7"/>
    <text x="104" y="583" font-family="Outfit" font-size="17" font-weight="400">github.com/BanguDevClub/musviz</text>
  </g>
  <text x="1120" y="583" text-anchor="end" font-family="Outfit" font-size="14" font-weight="500" letter-spacing="2" fill="#6f6f7a">OPEN SOURCE · MIT</text>
</svg>`;

console.log('Generating brand assets:');
render('icon-512.png', logoMark(512), 512, 512);
render('icon-192.png', logoMark(192), 192, 192);
render('apple-touch-icon.png', logoMark(180), 180, 180);
render('og.png', og, 1200, 630);
console.log('Done.');
