import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

interface GrapePalette {
  berryLight: string;
  berryMid: string;
  berryDark: string;
  highlight: string;
  leafLight: string;
  leafDark: string;
  stem: string;
  oval: number;
  rows: number[];
  leafSide: "left" | "right";
}

const PALETTES: Record<string, GrapePalette> = {
  "feteasca-neagra": {
    berryLight: "#8d587c",
    berryMid: "#4d2b4d",
    berryDark: "#24152f",
    highlight: "#d6a6c2",
    leafLight: "#5e8a55",
    leafDark: "#24452f",
    stem: "#6f4a2d",
    oval: 1.08,
    rows: [4, 5, 4, 4, 3, 2],
    leafSide: "right",
  },
  "feteasca-alba": {
    berryLight: "#e9e3a3",
    berryMid: "#c6ce72",
    berryDark: "#8c9e43",
    highlight: "#fff8c8",
    leafLight: "#7a9a5a",
    leafDark: "#315b38",
    stem: "#7a5530",
    oval: 1,
    rows: [4, 4, 4, 3, 3, 2],
    leafSide: "left",
  },
  "feteasca-regala": {
    berryLight: "#e3e8a7",
    berryMid: "#b7c96a",
    berryDark: "#7b913a",
    highlight: "#fbfbd9",
    leafLight: "#789b63",
    leafDark: "#345c3d",
    stem: "#775334",
    oval: 0.98,
    rows: [4, 5, 4, 3, 3, 2],
    leafSide: "right",
  },
  "tamaioasa-romaneasca": {
    berryLight: "#f0c28e",
    berryMid: "#d79868",
    berryDark: "#a56648",
    highlight: "#ffe8c7",
    leafLight: "#809765",
    leafDark: "#375b3e",
    stem: "#7b5532",
    oval: 1.02,
    rows: [3, 4, 4, 4, 3, 2],
    leafSide: "left",
  },
  "grasa-de-cotnari": {
    berryLight: "#efd58c",
    berryMid: "#d5b25e",
    berryDark: "#9a7c36",
    highlight: "#fff2bd",
    leafLight: "#7e9c62",
    leafDark: "#385d3c",
    stem: "#815a31",
    oval: 0.92,
    rows: [3, 3, 4, 3, 2],
    leafSide: "right",
  },
  "cramposie-selectionata": {
    berryLight: "#d7e5a1",
    berryMid: "#a7c46c",
    berryDark: "#6e8d3c",
    highlight: "#f3f9d4",
    leafLight: "#799961",
    leafDark: "#345a3b",
    stem: "#785333",
    oval: 1.12,
    rows: [4, 4, 4, 4, 3, 2],
    leafSide: "left",
  },
  "negru-de-dragasani": {
    berryLight: "#7c5c96",
    berryMid: "#452f62",
    berryDark: "#20152f",
    highlight: "#bca0d1",
    leafLight: "#63845a",
    leafDark: "#294631",
    stem: "#6e492e",
    oval: 1.05,
    rows: [4, 5, 4, 3, 3, 2],
    leafSide: "right",
  },
  novac: {
    berryLight: "#92618d",
    berryMid: "#552f60",
    berryDark: "#28162f",
    highlight: "#cba4c8",
    leafLight: "#68835d",
    leafDark: "#2d4834",
    stem: "#704a2f",
    oval: 1,
    rows: [4, 4, 5, 3, 3, 2],
    leafSide: "left",
  },
  "busuioaca-de-bohotin": {
    berryLight: "#e2a5ab",
    berryMid: "#bd6b7d",
    berryDark: "#844254",
    highlight: "#f8d5d9",
    leafLight: "#758f61",
    leafDark: "#35533b",
    stem: "#785034",
    oval: 1.04,
    rows: [4, 5, 4, 3, 3, 2],
    leafSide: "right",
  },
  cadarca: {
    berryLight: "#8e566d",
    berryMid: "#54283f",
    berryDark: "#281422",
    highlight: "#c694a9",
    leafLight: "#638059",
    leafDark: "#2c4733",
    stem: "#70472e",
    oval: 0.96,
    rows: [4, 4, 5, 4, 3, 2],
    leafSide: "left",
  },
};

function berryRows(rows: number[], radius: number): string {
  const gapX = radius * 2.16;
  const gapY = radius * 1.72;
  let y = 34;
  const html: string[] = [];
  for (const count of rows) {
    const startX = -((count - 1) * gapX) / 2;
    for (let index = 0; index < count; index += 1) {
      const x = startX + index * gapX;
      html.push(
        `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">` +
          `<ellipse cx="0" cy="${(radius * 0.4).toFixed(1)}" rx="${(radius * 0.92).toFixed(1)}" ry="${(radius * 0.34).toFixed(1)}" fill="#10120d" opacity="0.28"/>` +
          `<ellipse cx="0" cy="0" rx="${radius.toFixed(1)}" ry="${(radius * 1.08).toFixed(1)}" fill="url(#berry)"/>` +
          `<ellipse cx="${(-radius * 0.28).toFixed(1)}" cy="${(-radius * 0.38).toFixed(1)}" rx="${(radius * 0.28).toFixed(1)}" ry="${(radius * 0.18).toFixed(1)}" fill="${"url(#shine)"}" opacity="0.8"/>` +
          `<circle cx="0" cy="${-radius * 1.04}" r="${(radius * 0.13).toFixed(1)}" fill="#2b2119" opacity="0.55"/>` +
          "</g>",
      );
    }
    y += gapY;
  }
  return html.join("");
}

function leaf(side: "left" | "right"): string {
  const x = side === "left" ? -160 : 40;
  const y = -130;
  const flip = side === "left" ? -1 : 1;
  return `<g transform="translate(${x} ${y}) scale(${flip * 0.65} 0.65)" filter="url(#leafShadow)">
    <path d="M0 0C6-44 39-73 82-79c16-2 29 2 39 12 13-24 43-35 69-23 27 12 41 43 32 72 27 2 51 19 58 45 7 25-8 53-33 63 3 28-15 54-43 61-26 7-52-5-64-28-20 16-48 19-70 7-22-12-33-37-27-61-26-8-42-32-39-58 2-20 15-36 32-46C16 4 8 2 0 0Z" fill="url(#leaf)" stroke="#1d3524" stroke-opacity=".4" stroke-width="2"/>
    <path d="M0 0C51 24 103 52 143 86M48 13C61-25 91-55 130-69M74 32C102 36 130 46 154 63M92 8C113-17 132-35 163-44" fill="none" stroke="#2b4b32" stroke-opacity=".5" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M22 9C66 28 105 49 133 72" fill="none" stroke="#d9e4c5" stroke-opacity=".2" stroke-width="2"/>
  </g>`;
}

function svg(palette: GrapePalette): string {
  const radius = 34;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
  <defs>
    <radialGradient id="berry" cx="32%" cy="24%" r="78%">
      <stop offset="0" stop-color="${palette.berryLight}"/>
      <stop offset=".44" stop-color="${palette.berryMid}"/>
      <stop offset="1" stop-color="${palette.berryDark}"/>
    </radialGradient>
    <radialGradient id="shine" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${palette.highlight}" stop-opacity=".9"/>
      <stop offset="1" stop-color="${palette.highlight}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${palette.leafLight}"/>
      <stop offset="1" stop-color="${palette.leafDark}"/>
    </linearGradient>
    <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
    <filter id="leafShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="8" dy="10" stdDeviation="7" flood-color="#152117" flood-opacity=".2"/>
    </filter>
  </defs>
  <ellipse cx="320" cy="589" rx="176" ry="26" fill="#24170f" opacity=".14" filter="url(#softShadow)"/>
  <g transform="translate(320 270)">
    <path d="M0-178C-1-148 1-118 0-80C0-45 0-10 0 26" fill="none" stroke="${palette.stem}" stroke-width="10" stroke-linecap="round"/>
    <path d="M0-158C-24-170-43-186-60-207" fill="none" stroke="${palette.stem}" stroke-width="5" stroke-linecap="round" opacity=".8"/>
    <path d="M0-176C24-167 44-152 59-132" fill="none" stroke="${palette.stem}" stroke-width="4" stroke-linecap="round" opacity=".65"/>
    ${leaf(palette.leafSide)}
    <g transform="translate(0 0) rotate(-1.5)">${berryRows(palette.rows, radius)}</g>
  </g>
</svg>`;
}

async function main() {
  const outDir = path.join(process.cwd(), "public", "images", "grapes");
  mkdirSync(outDir, { recursive: true });
  for (const [slug, palette] of Object.entries(PALETTES)) {
    const file = path.join(outDir, `${slug}.webp`);
    await sharp(Buffer.from(svg(palette)))
      .resize(640, 640, { fit: "contain" })
      .webp({ quality: 84, alphaQuality: 92 })
      .toFile(file);
    console.log(`${slug}: ${file}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
