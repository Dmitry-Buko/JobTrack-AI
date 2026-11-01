/**
 * Одноразовый генератор графических ассетов JobTrack AI без зависимостей:
 * PNG-энкодер (zlib) + векторный рендер с суперсэмплингом.
 *
 *   node scripts/gen-icons.mjs
 *
 * Создаёт: public/favicon-*.png, public/apple-touch-icon.png,
 * public/icons/icon-{192,512,maskable-512}.png, public/og-image.png
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// ---------- PNG-энкодер ----------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // фильтр None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // глубина
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- Геометрия ----------

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function inRoundedRect(px, py, x, y, w, h, r) {
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const nx = Math.max(x + r - px, px - (x + w - r), 0);
  const ny = Math.max(y + r - py, py - (y + h - r), 0);
  return nx * nx + ny * ny <= r * r;
}

/** Фигура = функция (x, y) → покрытие [0..1]; строки — полилинии. */
function polylineHits(px, py, points, halfWidth) {
  for (let i = 0; i < points.length - 1; i += 1) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    if (segDist(px, py, ax, ay, bx, by) <= halfWidth) return true;
  }
  return false;
}

function circlePoints(cx, cy, r, fromAngle = 0, toAngle = Math.PI * 2) {
  const points = [];
  const steps = 24;
  for (let i = 0; i <= steps; i += 1) {
    const angle = fromAngle + ((toAngle - fromAngle) * i) / steps;
    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return points;
}

// ---------- Растеризатор ----------

/** Рисует в RGBA-буфер: shape(x, y) возвращает true для покрытой точки. */
function render(width, height, shape, { samples = 3 } = {}) {
  const rgba = Buffer.alloc(width * height * 4);
  const step = 1 / samples;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let hit = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          if (shape(x + (sx + 0.5) * step, y + (sy + 0.5) * step)) hit += 1;
        }
      }
      const alpha = hit / (samples * samples);
      const offset = (y * width + x) * 4;
      if (alpha > 0) {
        rgba[offset] = 255;
        rgba[offset + 1] = 255;
        rgba[offset + 2] = 255;
        rgba[offset + 3] = Math.round(alpha * 255);
      }
    }
  }
  return rgba;
}

/** Заливает фон цветом там, где покрытие > 0, и возвращает буфер. */
function paintOver(rgba, width, height, color, coverage) {
  const out = Buffer.from(rgba);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = coverage(x + 0.5, y + 0.5) ? 1 : 0;
      if (!alpha) continue;
      const offset = (y * width + x) * 4;
      out[offset] = color[0];
      out[offset + 1] = color[1];
      out[offset + 2] = color[2];
      out[offset + 3] = Math.max(out[offset + 3], color[3]);
    }
  }
  return out;
}

// ---------- Знак: чемодан ----------

/** Чемодан Lucide-стиля: тело + ручка, вписан в box (x, y, size). */
function suitcaseShape(x, y, size) {
  const bodyX = x + size * 0.2;
  const bodyY = y + size * 0.34;
  const bodyW = size * 0.6;
  const bodyH = size * 0.44;
  const bodyR = size * 0.06;
  const handleCx = x + size * 0.5;
  const handleCy = y + size * 0.34;
  const handleOuter = size * 0.15;
  const handleInner = size * 0.08;
  const stroke = size * 0.045;

  return (px, py) => {
    // Тело: скруглённый прямоугольник-контур.
    const inOuter = inRoundedRect(px, py, bodyX, bodyY, bodyW, bodyH, bodyR);
    const inInner = inRoundedRect(px, py, bodyX + stroke, bodyY + stroke, bodyW - 2 * stroke, bodyH - 2 * stroke, bodyR * 0.7);
    if (inOuter && !inInner) return true;
    // Ручка: полукольцо над телом.
    if (py <= handleCy + 0.5 * stroke) {
      const dist = Math.hypot(px - handleCx, py - handleCy);
      if (dist <= handleOuter + stroke / 2 && dist >= handleInner - stroke / 2) return true;
    }
    return false;
  };
}

function solidRoundedRect(x, y, w, h, r) {
  return (px, py) => inRoundedRect(px, py, x, y, w, h, r);
}

// ---------- Иконки приложения ----------

function makeIcon(size, { maskable = false } = {}) {
  // Знак-подложка: сплошной скруглённый синий квадрат.
  const cornerR = size * 0.22;
  const bg = render(size, size, solidRoundedRect(0, 0, size, size, cornerR));

  // Чемодан: у maskable — с отступом 30% (safe zone), иначе 22%.
  const inset = maskable ? size * 0.3 : size * 0.22;
  const glyph = render(size, size, suitcaseShape(inset, inset, size - 2 * inset));

  // Композиция: синий фон + белый глиф.
  const out = Buffer.from(bg);
  for (let i = 0; i < out.length; i += 4) {
    const glyphAlpha = glyph[i + 3] / 255;
    const bgAlpha = bg[i + 3] / 255;
    const alpha = glyphAlpha + bgAlpha * (1 - glyphAlpha);
    if (alpha > 0) {
      out[i] = Math.round((255 * glyphAlpha + 0x00 * bgAlpha * (1 - glyphAlpha)) / alpha);
      out[i + 1] = Math.round((255 * glyphAlpha + 0x7a * bgAlpha * (1 - glyphAlpha)) / alpha);
      out[i + 2] = Math.round((255 * glyphAlpha + 0xff * bgAlpha * (1 - glyphAlpha)) / alpha);
      out[i + 3] = Math.round(alpha * 255);
    }
  }
  return encodePng(size, size, out);
}

// ---------- Векторный шрифт для og-image (полилинии) ----------

// Глифы в координатах: x — [0..width], y — 0 верх, 1 базовая линия.
const GLYPHS = {
  J: { w: 0.55, strokes: [[[0.3, 0], [0.3, 0.62], [0.2, 0.92], [0.02, 0.82]]] },
  o: { w: 0.58, strokes: [circlePoints(0.29, 0.7, 0.245)] },
  b: { w: 0.58, strokes: [[[0.09, 0], [0.09, 1]], circlePoints(0.34, 0.745, 0.245)] },
  T: { w: 0.72, strokes: [[[0, 0], [0.72, 0]], [[0.36, 0], [0.36, 1]]] },
  r: { w: 0.42, strokes: [[[0.09, 0.32], [0.09, 1]], [[0.09, 0.44], [0.28, 0.44], [0.42, 0.3]]] },
  a: { w: 0.62, strokes: [circlePoints(0.31, 0.755, 0.245), [[0.555, 0.4], [0.555, 1]]] },
  c: { w: 0.56, strokes: [circlePoints(0.29, 0.7, 0.245, 0.45, Math.PI * 2 - 0.45)] },
  k: { w: 0.56, strokes: [[[0.09, 0], [0.09, 1]], [[0.54, 0.3], [0.11, 0.66]], [[0.2, 0.56], [0.56, 1]]] },
  A: { w: 0.75, strokes: [[[0, 1], [0.375, 0], [0.75, 1]], [[0.15, 0.72], [0.6, 0.72]]] },
  I: { w: 0.42, strokes: [[[0.05, 0], [0.37, 0]], [[0.21, 0], [0.21, 1]], [[0.05, 1], [0.37, 1]]] },
  ' ': { w: 0.55, strokes: [] },
};

/** Рисует текст полилиниями; возвращает shape-функцию. */
function textShape(text, originX, baselineY, capHeight, strokeWidth) {
  const half = strokeWidth / 2;
  let cursor = originX;
  const strokes = [];
  for (const char of text) {
    const glyph = GLYPHS[char];
    if (!glyph) throw new Error(`Нет глифа: ${char}`);
    for (const stroke of glyph.strokes) {
      // gy=0 — верх буквы (baseline - capHeight), gy=1 — базовая линия.
      strokes.push(stroke.map(([gx, gy]) => [cursor + gx * capHeight, baselineY - capHeight + gy * capHeight]));
    }
    cursor += glyph.w * capHeight;
  }
  return { width: cursor - originX, shape: (px, py) => strokes.some((s) => polylineHits(px, py, s, half)) };
}

// ---------- OG-картинка 1200×630 ----------

function makeOgImage() {
  const W = 1200;
  const H = 630;
  // Диагональный градиент #0A84FF → #0049C4.
  const bg = Buffer.alloc(W * H * 4);
  const [r1, g1, b1] = [0x0a, 0x84, 0xff];
  const [r2, g2, b2] = [0x00, 0x49, 0xc4];
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const t = (x / W + y / H) / 2;
      const offset = (y * W + x) * 4;
      bg[offset] = Math.round(r1 + (r2 - r1) * t);
      bg[offset + 1] = Math.round(g1 + (g2 - g1) * t);
      bg[offset + 2] = Math.round(b1 + (b2 - b1) * t);
      bg[offset + 3] = 255;
    }
  }

  // Мягкие блики: два больших полупрозрачных круга.
  const glow = Buffer.from(bg);
  const blend = (cx, cy, r, alphaBoost) => {
    for (let y = Math.max(0, cy - r); y < Math.min(H, cy + r); y += 1) {
      for (let x = Math.max(0, cx - r); x < Math.min(W, cx + r); x += 1) {
        const dist = Math.hypot(x - cx, y - cy);
        if (dist > r) continue;
        const offset = (y * W + x) * 4;
        glow[offset] = Math.min(255, glow[offset] + alphaBoost * (1 - dist / r) * 40);
        glow[offset + 1] = Math.min(255, glow[offset + 1] + alphaBoost * (1 - dist / r) * 40);
        glow[offset + 2] = Math.min(255, glow[offset + 2] + alphaBoost * (1 - dist / r) * 40);
      }
    }
  };
  blend(1050, 80, 320, 1);
  blend(150, 600, 260, 0.6);

  // Белая карточка со знаком.
  const cardSize = 190;
  const cardX = 96;
  const cardY = (H - cardSize) / 2;
  const cardR = 44;
  const white = render(W, H, solidRoundedRect(cardX, cardY, cardSize, cardSize, cardR));

  // Синий чемодан внутри карточки (30% от карточки — знак).
  const inner = cardSize * 0.72;
  const inset = (cardSize - inner) / 2;
  const glyph = render(W, H, suitcaseShape(cardX + inset, cardY + inset, inner));
  for (let i = 0; i < white.length; i += 4) {
    if (glyph[i + 3] > 0) {
      white[i] = 0x00;
      white[i + 1] = 0x7a;
      white[i + 2] = 0xff;
    }
  }

  // Текст «JobTrack AI».
  const cap = 112;
  const baseline = H / 2 + cap * 0.36;
  const text = textShape('JobTrack AI', 0, baseline, cap, cap * 0.16);
  // Центрируем текст в области справа от карточки.
  const areaStart = cardX + cardSize + 48;
  const areaEnd = W - 72;
  const shift = areaStart + (areaEnd - areaStart - text.width) / 2;
  const shifted = render(W, H, (px, py) => py >= 0 && py <= H && text.shape(px - shift, py));

  const out = glow;
  const layers = [white, shifted];
  for (const layer of layers) {
    for (let i = 0; i < out.length; i += 4) {
      const a = layer[i + 3] / 255;
      if (a === 0) continue;
      out[i] = Math.round(layer[i] * a + out[i] * (1 - a));
      out[i + 1] = Math.round(layer[i + 1] * a + out[i + 1] * (1 - a));
      out[i + 2] = Math.round(layer[i + 2] * a + out[i + 2] * (1 - a));
      out[i + 3] = 255;
    }
  }
  return encodePng(W, H, out);
}

// ---------- Сборка ----------

mkdirSync(join(PUBLIC_DIR, 'icons'), { recursive: true });

const files = [
  ['favicon-32.png', makeIcon(32)],
  ['favicon-16.png', makeIcon(16)],
  ['apple-touch-icon.png', makeIcon(180)],
  ['icons/icon-192.png', makeIcon(192)],
  ['icons/icon-512.png', makeIcon(512)],
  ['icons/icon-maskable-512.png', makeIcon(512, { maskable: true })],
  ['og-image.png', makeOgImage()],
];

for (const [name, png] of files) {
  writeFileSync(join(PUBLIC_DIR, name), png);
  console.log(`${name}: ${(png.length / 1024).toFixed(1)} КБ`);
}
console.log('Готово → public/');
