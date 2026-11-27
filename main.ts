// news-image-20261127 — "The World in One Image: Friday 27 November 2026"
// A self-contained Node 22 program (standard library only, no network) that
// draws a 1024x1024 news infographic and writes it to
// $MAKEFUN_OUTPUT_DIR/entry.png (default ./out/entry.png).
//
// Everything is drawn in code: a tiny software rasteriser, a hand-written
// 5x7 bitmap font, simple vector pictograms, and a hand-rolled PNG encoder
// (zlib deflate + CRC32). No images, fonts or code are loaded from anywhere.
// The output is fully deterministic: same input, same bytes, every run.

import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// CRC32 (PNG chunk checksums)
// ---------------------------------------------------------------------------
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePng(w: number, h: number, rgba: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0; // filter: none
    rgba.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 bits, written as strings.
// ---------------------------------------------------------------------------
type Glyph = string[];
const FONT: Record<string, Glyph> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "11110", "10001", "10001", "10001", "11110"],
  c: ["00000", "00000", "01110", "10000", "10000", "10001", "01110"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01001", "01000", "11110", "01000", "01000", "01000"],
  g: ["00000", "01111", "10001", "10001", "01111", "00001", "01110"],
  h: ["10000", "10000", "11110", "10001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", "00000", "00110", "00010", "00010", "10010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "11110", "10001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "00000", "11110", "10001", "10001", "11110", "10000"],
  q: ["00000", "00000", "01111", "10001", "10001", "01111", "00001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["00100", "00100", "11110", "00100", "00100", "00100", "00010"],
  u: ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  w: ["00000", "00000", "10001", "10101", "10101", "10101", "01010"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  z: ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  '"': ["01010", "01010", "01010", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "–": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "*": ["00000", "10101", "01110", "11111", "01110", "10101", "00000"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "@": ["01110", "10001", "10111", "10101", "10110", "10000", "01110"],
  _: ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  "•": ["00000", "00000", "01100", "01100", "00000", "00000", "00000"],
  "·": ["00000", "00000", "01100", "01100", "00000", "00000", "00000"],
  ">": ["01000", "00100", "00010", "00001", "00010", "00100", "01000"],
  "<": ["00010", "00100", "01000", "10000", "01000", "00100", "00010"],
  "×": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
};

// ---------------------------------------------------------------------------
// Canvas: a plain RGBA buffer with tiny drawing primitives.
// ---------------------------------------------------------------------------
type RGB = [number, number, number];

class Canvas {
  readonly w: number;
  readonly h: number;
  readonly px: Buffer;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = Buffer.alloc(w * h * 4, 255);
  }
  set(x: number, y: number, c: RGB): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
    this.px[i + 3] = 255;
  }
  fill(c: RGB): void {
    for (let i = 0; i < this.w * this.h; i++) {
      this.px[i * 4] = c[0];
      this.px[i * 4 + 1] = c[1];
      this.px[i * 4 + 2] = c[2];
      this.px[i * 4 + 3] = 255;
    }
  }
  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
  }
  /** Filled circle. */
  disc(cx: number, cy: number, r: number, c: RGB): void {
    for (let yy = cy - r; yy <= cy + r; yy++)
      for (let xx = cx - r; xx <= cx + r; xx++) {
        const dx = xx - cx;
        const dy = yy - cy;
        if (dx * dx + dy * dy <= r * r) this.set(xx, yy, c);
      }
  }
  /** Circle outline, 1-2 px thick. */
  ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
    for (let yy = cy - r - t; yy <= cy + r + t; yy++)
      for (let xx = cx - r - t; xx <= cx + r + t; xx++) {
        const d = Math.sqrt((xx - cx) * (xx - cx) + (yy - cy) * (yy - cy));
        if (Math.abs(d - r) <= t / 2) this.set(xx, yy, c);
      }
  }
  line(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
    const half = Math.floor(t / 2);
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(x0 + (dx * s) / steps);
      const y = Math.round(y0 + (dy * s) / steps);
      for (let yy = y - half; yy <= y + half; yy++)
        for (let xx = x - half; xx <= x + half; xx++) this.set(xx, yy, c);
    }
  }
  /** Filled triangle (edge-scanline fill). */
  tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
    const minY = Math.min(y0, y1, y2);
    const maxY = Math.max(y0, y1, y2);
    const pts: [number, number][] = [[x0, y0], [x1, y1], [x2, y2]];
    for (let y = minY; y <= maxY; y++) {
      const xs: number[] = [];
      for (let i = 0; i < 3; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % 3];
        if (ay === by) continue;
        const lo = Math.min(ay, by);
        const hi = Math.max(ay, by);
        if (y < lo || y > hi) continue;
        xs.push(ax + ((bx - ax) * (y - ay)) / (by - ay));
      }
      if (xs.length < 2) continue;
      const x0f = Math.min(...xs);
      const x1f = Math.max(...xs);
      for (let x = Math.round(x0f); x <= Math.round(x1f); x++) this.set(x, y, c);
    }
  }
  /** Filled trapezoid (for hulls): top width wt at y0, bottom width wb at y1. */
  trap(cx: number, y0: number, y1: number, wt: number, wb: number, c: RGB): void {
    for (let y = y0; y <= y1; y++) {
      const f = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
      const w = wt + (wb - wt) * f;
      const x0 = Math.round(cx - w / 2);
      const x1 = Math.round(cx + w / 2);
      for (let x = x0; x <= x1; x++) this.set(x, y, c);
    }
  }
  // -- text ---------------------------------------------------------------
  glyph(ch: string, x: number, y: number, s: number, c: RGB, bold: boolean): void {
    const g = FONT[ch] ?? FONT["?"];
    for (let r = 0; r < 7; r++)
      for (let col = 0; col < 5; col++) {
        if (g[r][col] !== "1") continue;
        const ox = bold ? 1 : 0;
        for (let dy = 0; dy < s; dy++)
          for (let dx = 0; dx < s; dx++) {
            this.set(x + col * s + dx, y + r * s + dy, c);
            if (bold) this.set(x + col * s + dx + ox, y + r * s + dy, c);
          }
      }
  }
  textWidth(str: string, s: number): number {
    let w = 0;
    for (const ch of str) w += 6 * s;
    return w > 0 ? w - s : 0; // no trailing gap
  }
  text(str: string, x: number, y: number, s: number, c: RGB, bold = false): void {
    let cx = x;
    for (const ch of str) {
      this.glyph(ch, cx, y, s, c, bold);
      cx += 6 * s;
    }
  }
  /** Word-wrap into lines of at most maxW px. Returns the lines. */
  wrap(str: string, s: number, maxW: number): string[] {
    const words = str.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const word of words) {
      const test = cur ? cur + " " + word : word;
      if (this.textWidth(test, s) <= maxW || !cur) {
        cur = test;
      } else {
        lines.push(cur);
        cur = word;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }
  /** Draw wrapped text; returns the y just below the last line. */
  para(str: string, x: number, y: number, s: number, lh: number, c: RGB, maxW: number, bold = false, maxLines = 99): number {
    const lines = this.wrap(str, s, maxW).slice(0, maxLines);
    lines.forEach((ln, i) => this.text(ln, x, y + i * lh, s, c, bold));
    return y + lines.length * lh;
  }
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
const PAPER: RGB = [246, 241, 231];
const INK: RGB = [20, 33, 61];
const NAVY: RGB = [16, 35, 63];
const RED: RGB = [193, 39, 45];
const WHITE: RGB = [255, 255, 255];
const CARD: RGB = [255, 255, 255];
const BORDER: RGB = [216, 207, 185];
const MUTED: RGB = [91, 100, 112];
const LIGHTGREY: RGB = [226, 220, 205];

// ---------------------------------------------------------------------------
// The day's news — each item verified against reporting published 27 Nov 2026.
// ---------------------------------------------------------------------------
interface Story {
  num: string;
  tag: string;
  headline: string;
  body: string;
  source: string;
  accent: RGB;
  tint: RGB;
  icon: string;
}

const STORIES: Story[] = [
  {
    num: "01",
    tag: "MIDDLE EAST — GULF",
    headline: "Drones over Kuwait kill two Italians",
    body: "Kuwait said it shot down drones it blamed on Iran; debris killed two Italian technicians. Tehran denied any role.",
    source: "Sources: AP via AsiaOne · Al Jazeera · Firstpost",
    accent: RED,
    tint: [252, 231, 232],
    icon: "drone",
  },
  {
    num: "02",
    tag: "MIDDLE EAST — GAZA",
    headline: "Strikes kill 10 in Gaza as truce frays",
    body: "Five Israeli strikes and a shooting killed 10 people, hospitals said, over a year after the ceasefire.",
    source: "Source: AP via AsiaOne",
    accent: [14, 124, 123],
    tint: [222, 240, 239],
    icon: "peace",
  },
  {
    num: "03",
    tag: "DIPLOMACY — USA / RUSSIA",
    headline: "Trump tells Putin: pull back",
    body: "Trump said he urged Putin, when they met in China, to end 'military aggression' across Europe.",
    source: "Source: The Japan Times · Reuters",
    accent: [29, 78, 216],
    tint: [226, 235, 252],
    icon: "flags",
  },
  {
    num: "04",
    tag: "EUROPE — ECONOMY",
    headline: "Europe picks a new central bank chief",
    body: "EU leaders backed Pablo Hernandez de Cos of Spain to lead the ECB after Lagarde steps down.",
    source: "Source: Reuters · CNN",
    accent: [180, 83, 9],
    tint: [250, 235, 216],
    icon: "bank",
  },
  {
    num: "05",
    tag: "MARKETS — ENERGY",
    headline: "Oil jumps past $93 as Gulf fears grow",
    body: "Brent rose to about $96 on Gulf supply fears after a claimed Houthi refinery hit and mine strikes.",
    source: "Source: Reuters · Dawn",
    accent: [109, 40, 217],
    tint: [238, 229, 252],
    icon: "barrel",
  },
  {
    num: "06",
    tag: "EUROPE — DISASTER AT SEA",
    headline: "Tanker capsizes off Ibiza; one dead",
    body: "The Malta-flagged tanker Med Emre, carrying 7,000 tonnes of diesel, keeled over off Ibiza; one died.",
    source: "Source: Reuters via CNA",
    accent: [71, 85, 105],
    tint: [230, 234, 240],
    icon: "tanker",
  },
  {
    num: "07",
    tag: "ASIA — THAILAND",
    headline: "Blast rocks Bangkok refinery; nine hurt",
    body: "An explosion and fire at Bangchak's Phra Khanong refinery in Bangkok injured nine, three critically.",
    source: "Source: CNN · Al Jazeera",
    accent: [194, 65, 12],
    tint: [252, 231, 216],
    icon: "refinery",
  },
];

// ---------------------------------------------------------------------------
// Pictograms — small vector drawings, one per story.
// (x, y) is the top-left of the icon box; s is the box size.
// ---------------------------------------------------------------------------
function drawIcon(cv: Canvas, kind: string, x: number, y: number, s: number, c: RGB): void {
  const u = s / 64; // unit
  const cx = x + s / 2;
  const cy = y + s / 2;
  if (kind === "drone") {
    // quadcopter, side view: two rotor bars on masts, body, skids
    const bar = Math.max(3, 4 * u);
    cv.rect(cx - 26 * u, cy - 24 * u, 52 * u, bar, c);
    cv.rect(cx - 26 * u, cy - 24 * u, 10 * u, bar, c);
    cv.line(cx - 18 * u, cy - 20 * u, cx - 18 * u, cy - 6 * u, Math.max(2, 3 * u), c);
    cv.line(cx + 18 * u, cy - 20 * u, cx + 18 * u, cy - 6 * u, Math.max(2, 3 * u), c);
    cv.rect(cx - 16 * u, cy - 6 * u, 32 * u, 14 * u, c);
    cv.disc(cx, cy + 1 * u, Math.max(2, 3.5 * u), WHITE);
    cv.line(cx - 12 * u, cy + 12 * u, cx - 12 * u, cy + 20 * u, Math.max(2, 3 * u), c);
    cv.line(cx + 12 * u, cy + 12 * u, cx + 12 * u, cy + 20 * u, Math.max(2, 3 * u), c);
    cv.line(cx - 18 * u, cy + 20 * u, cx + 18 * u, cy + 20 * u, Math.max(2, 3 * u), c);
  } else if (kind === "peace") {
    // peace sign: ring, stem, two diagonals
    cv.ring(cx, cy, 24 * u, Math.max(2, 3 * u), c);
    cv.line(cx, cy - 24 * u, cx, cy + 24 * u, Math.max(2, 3 * u), c);
    cv.line(cx, cy, cx - 17 * u, cy + 17 * u, Math.max(2, 3 * u), c);
    cv.line(cx, cy, cx + 17 * u, cy + 17 * u, Math.max(2, 3 * u), c);
  } else if (kind === "flags") {
    // two small flags on poles: USA (stripes + canton) and Russia (tricolour)
    cv.line(cx - 16 * u, cy - 22 * u, cx - 16 * u, cy + 22 * u, Math.max(2, 3 * u), c);
    cv.line(cx + 16 * u, cy - 22 * u, cx + 16 * u, cy + 22 * u, Math.max(2, 3 * u), c);
    // US flag, left: red stripes on white, blue canton
    cv.rect(cx - 16 * u, cy - 20 * u, 24 * u, 18 * u, WHITE);
    cv.rect(cx - 16 * u, cy - 20 * u, 24 * u, 4 * u, RED);
    cv.rect(cx - 16 * u, cy - 11 * u, 24 * u, 4 * u, RED);
    cv.rect(cx - 16 * u, cy - 2 * u, 24 * u, 4 * u, RED);
    cv.rect(cx - 16 * u, cy - 20 * u, 11 * u, 9 * u, [29, 78, 216]);
    // Russian flag, right: white / blue / red bands
    cv.rect(cx + 16 * u, cy - 20 * u, 24 * u, 6 * u, WHITE);
    cv.rect(cx + 16 * u, cy - 14 * u, 24 * u, 6 * u, [29, 78, 216]);
    cv.rect(cx + 16 * u, cy - 8 * u, 24 * u, 6 * u, RED);
  } else if (kind === "bank") {
    // classical bank: pediment, three columns, base
    cv.tri(cx - 24 * u, cy - 8 * u, cx + 24 * u, cy - 8 * u, cx, cy - 24 * u, c);
    cv.disc(cx, cy - 12 * u, Math.max(2, 3 * u), WHITE);
    for (const dx of [-16, 0, 16] as const) {
      cv.rect(cx + dx * u - 3 * u, cy - 6 * u, 6 * u, 20 * u, c);
    }
    cv.rect(cx - 26 * u, cy + 16 * u, 52 * u, 5 * u, c);
    cv.rect(cx - 28 * u, cy + 23 * u, 56 * u, 4 * u, c);
  } else if (kind === "barrel") {
    // oil barrel with flame
    cv.tri(cx - 6 * u, cy - 26 * u, cx + 6 * u, cy - 26 * u, cx, cy - 8 * u, [194, 65, 12]);
    cv.disc(cx, cy - 24 * u, Math.max(2, 4 * u), [245, 158, 11]);
    cv.rect(cx - 15 * u, cy - 6 * u, 30 * u, 30 * u, c);
    cv.rect(cx - 15 * u, cy - 6 * u, 30 * u, 4 * u, WHITE);
    cv.rect(cx - 15 * u, cy + 4 * u, 30 * u, 3 * u, WHITE);
    cv.rect(cx - 15 * u, cy + 20 * u, 30 * u, 4 * u, WHITE);
  } else if (kind === "tanker") {
    // capsized tanker: hull keel-up, cabin below, waves
    cv.trap(cx, cy - 14 * u, cy + 8 * u, 44 * u, 30 * u, c);
    cv.rect(cx - 6 * u, cy + 8 * u, 12 * u, 8 * u, c);
    for (const wy of [24, 30] as const) {
      for (let i = 0; i < 3; i++) {
        cv.line(cx - 26 * u + i * 20 * u, cy + wy * u, cx - 16 * u + i * 20 * u, cy + wy * u, Math.max(2, 2.5 * u), c);
      }
    }
  } else if (kind === "refinery") {
    // refinery towers with flame and smoke
    cv.rect(cx - 22 * u, cy - 2 * u, 12 * u, 26 * u, c);
    cv.rect(cx - 4 * u, cy - 12 * u, 12 * u, 36 * u, c);
    cv.rect(cx + 12 * u, cy + 6 * u, 12 * u, 18 * u, c);
    cv.tri(cx + 2 * u, cy - 26 * u, cx + 10 * u, cy - 26 * u, cx + 6 * u, cy - 12 * u, [194, 65, 12]);
    cv.disc(cx - 16 * u, cy - 12 * u, Math.max(2, 4 * u), MUTED);
    cv.disc(cx - 22 * u, cy - 20 * u, Math.max(2, 3 * u), MUTED);
    cv.rect(cx - 26 * u, cy + 24 * u, 52 * u, 3 * u, c);
  }
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;

function draw(): Canvas {
  const cv = new Canvas(W, H);
  cv.fill(PAPER);

  // ---- masthead -----------------------------------------------------------
  cv.rect(0, 0, W, 148, NAVY);
  cv.rect(0, 144, W, 4, RED);
  cv.text("THE WORLD IN ONE IMAGE", 36, 24, 2, [176, 190, 210], true);
  cv.text("FRIDAY 27 NOVEMBER 2026", 36, 52, 6, WHITE, true);
  cv.text("Seven stories that defined the day — checked against the day's reporting", 36, 112, 2, [176, 190, 210]);

  // ---- hero story (01) ----------------------------------------------------
  const hero = STORIES[0];
  const hx = 36;
  const hy = 164;
  const hw = 952;
  const hh = 172;
  cv.rect(hx, hy, hw, hh, CARD);
  cv.rect(hx, hy, hw, 1, BORDER);
  cv.rect(hx, hy + hh - 1, hw, 1, BORDER);
  cv.rect(hx, hy, 1, hh, BORDER);
  cv.rect(hx + hw - 1, hy, 1, hh, BORDER);
  cv.rect(hx, hy, 10, hh, hero.accent);
  // icon, right side
  cv.disc(hx + hw - 84, hy + hh / 2, 58, hero.tint);
  drawIcon(cv, hero.icon, hx + hw - 84 - 46, hy + hh / 2 - 46, 92, hero.accent);
  // number + tag
  cv.text(hero.num, hx + 30, hy + 16, 3, hero.accent, true);
  cv.text(hero.tag, hx + 78, hy + 24, 2, hero.accent, true);
  // headline
  cv.para(hero.headline, hx + 30, hy + 52, 4, 30, INK, 700, true, 2);
  // body
  cv.para(hero.body, hx + 30, hy + 118, 2, 17, [43, 52, 66], 760, false, 2);
  // source
  cv.text(hero.source, hx + 30, hy + 156, 2, MUTED);

  // ---- grid: stories 02–07 ------------------------------------------------
  const colW = 468;
  const colGap = 16;
  const rowH = 180;
  const rowGap = 12;
  const gx0 = 36;
  const gy0 = 352;
  for (let i = 1; i < STORIES.length; i++) {
    const st = STORIES[i];
    const col = (i - 1) % 2;
    const row = Math.floor((i - 1) / 2);
    const x = gx0 + col * (colW + colGap);
    const y = gy0 + row * (rowH + rowGap);
    cv.rect(x, y, colW, rowH, CARD);
    cv.rect(x, y, colW, 1, BORDER);
    cv.rect(x, y + rowH - 1, colW, 1, BORDER);
    cv.rect(x, y, 1, rowH, BORDER);
    cv.rect(x + colW - 1, y, 1, rowH, BORDER);
    cv.rect(x, y, colW, 6, st.accent);
    // number badge
    cv.disc(x + 32, y + 32, 15, st.accent);
    cv.text(st.num, x + 32 - 10, y + 32 - 7, 2, WHITE, true);
    // tag
    cv.text(st.tag, x + 56, y + 25, 2, st.accent, true);
    // small icon, top right
    cv.disc(x + colW - 44, y + 36, 26, st.tint);
    drawIcon(cv, st.icon, x + colW - 44 - 24, y + 36 - 24, 48, st.accent);
    // headline (width leaves room for the icon on the first lines)
    cv.para(st.headline, x + 18, y + 56, 3, 24, INK, colW - 36 - 62, true, 2);
    // body
    cv.para(st.body, x + 18, y + 110, 2, 16, [43, 52, 66], colW - 36, false, 3);
    // source
    cv.text(st.source, x + 18, y + rowH - 16, 2, MUTED);
  }

  // ---- footer -------------------------------------------------------------
  const fy = 928;
  cv.rect(0, fy, W, H - fy, NAVY);
  cv.rect(0, fy, W, 3, RED);
  cv.para(
    "ALSO TODAY — Black Friday: the year's biggest shopping day; global online sales forecast near $357bn. UK net migration falls to 77,000.",
    36, fy + 12, 2, 18, WHITE, 952, false, 2,
  );
  cv.text(
    "Sources: AP · Reuters · CNN · Al Jazeera · Japan Times · Dawn · Xinhua",
    36, fy + 56, 2, [150, 162, 182],
  );

  return cv;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
  mkdirSync(outDir, { recursive: true });
  const cv = draw();
  const png = encodePng(W, H, cv.px);
  const outPath = join(outDir, "entry.png");
  writeFileSync(outPath, png);
  // eslint-disable-next-line no-console
  console.log(`wrote ${outPath} (${png.length} bytes)`);
}

main();
