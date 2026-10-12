export type RgbColor = { r: number; g: number; b: number };
export type HslColor = { h: number; s: number; l: number };

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function normalizeHex(input: string): string | null {
  const match = input.trim().match(HEX_PATTERN);
  if (!match) return null;
  const value = match[1];
  const expanded = value.length === 3 ? value.split("").map((character) => character + character).join("") : value;
  return `#${expanded.toLowerCase()}`;
}

export function hexToRgb(hex: string): RgbColor {
  const normalized = normalizeHex(hex);
  if (!normalized) throw new Error("Invalid hex color");
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  const toHex = (value: number) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return { h: Math.round(hue), s: Math.round(saturation * 100), l: Math.round(lightness * 100) };
}

function channelLuminance(channel: number) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function getLuminance(color: RgbColor) {
  return 0.2126 * channelLuminance(color.r) + 0.7152 * channelLuminance(color.g) + 0.0722 * channelLuminance(color.b);
}

export function getContrastRatio(first: RgbColor, second: RgbColor) {
  const lightest = Math.max(getLuminance(first), getLuminance(second));
  const darkest = Math.min(getLuminance(first), getLuminance(second));
  return (lightest + 0.05) / (darkest + 0.05);
}

function hslToRgb({ h, s, l }: HslColor): RgbColor {
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hueSection = (((h % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((hueSection % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSection < 1) [red, green, blue] = [chroma, x, 0];
  else if (hueSection < 2) [red, green, blue] = [x, chroma, 0];
  else if (hueSection < 3) [red, green, blue] = [0, chroma, x];
  else if (hueSection < 4) [red, green, blue] = [0, x, chroma];
  else if (hueSection < 5) [red, green, blue] = [x, 0, chroma];
  else [red, green, blue] = [chroma, 0, x];

  const match = lightness - chroma / 2;
  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
  };
}

export function createPalette(hex: string) {
  const rgb = hexToRgb(hex);
  const base = rgbToHsl(rgb);
  return [
    { label: "浅色", hex: rgbToHex(hslToRgb({ ...base, l: clamp(base.l + 28, 8, 92) })) },
    { label: "柔和", hex: rgbToHex(hslToRgb({ ...base, s: clamp(base.s - 22, 0, 100), l: clamp(base.l + 12, 8, 92) })) },
    { label: "主色", hex: rgbToHex(rgb) },
    { label: "深色", hex: rgbToHex(hslToRgb({ ...base, l: clamp(base.l - 18, 8, 92) })) },
    { label: "补色", hex: rgbToHex(hslToRgb({ ...base, h: (base.h + 180) % 360 })) },
  ];
}
export function extractDominantColors(
  pixels: Uint8ClampedArray,
  maxColors = 5,
): string[] {
  if (pixels.length % 4 !== 0) {
    throw new Error("Pixel data must use RGBA channels");
  }

  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
  const pixelCount = pixels.length / 4;
  const sampleStep = pixelCount <= 64 ? 1 : pixels.length > 400_000 ? 32 : pixels.length > 120_000 ? 16 : 8;

  for (let index = 0; index < pixels.length; index += 4 * sampleStep) {
    const alpha = pixels[index + 3];
    if (alpha < 128) continue;

    const r = Math.round(pixels[index] / 32) * 32;
    const g = Math.round(pixels[index + 1] / 32) * 32;
    const b = Math.round(pixels[index + 2] / 32) * 32;
    const key = `${r}-${g}-${b}`;
    const bucket = buckets.get(key);

    if (bucket) bucket.count += 1;
    else buckets.set(key, { count: 1, r, g, b });
  }

  const ranked = [...buckets.values()].sort((first, second) => second.count - first.count);
  const colors: RgbColor[] = [];

  for (const bucket of ranked) {
    const isDistinct = colors.every((color) => {
      const distance =
        Math.abs(color.r - bucket.r) +
        Math.abs(color.g - bucket.g) +
        Math.abs(color.b - bucket.b);
      return distance > 54;
    });

    if (isDistinct) colors.push({ r: bucket.r, g: bucket.g, b: bucket.b });
    if (colors.length === maxColors) break;
  }

  return colors.map(rgbToHex);
}