import { describe, expect, it } from "vitest";
import {
  createPalette,
  extractDominantColors,
  getContrastRatio,
  hexToRgb,
  normalizeHex,
  rgbToHex,
  rgbToHsl,
} from "./colorUtils";

describe("color utils", () => {
  it("normalizes hex input", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("2e5bff")).toBe("#2e5bff");
    expect(normalizeHex("invalid")).toBeNull();
  });

  it("converts hex to rgb and back", () => {
    const rgb = hexToRgb("#2e5bff");
    expect(rgb).toEqual({ r: 46, g: 91, b: 255 });
    expect(rgbToHex(rgb)).toBe("#2e5bff");
  });

  it("converts red to HSL", () => {
    expect(rgbToHsl(hexToRgb("#ff0000"))).toEqual({ h: 0, s: 100, l: 50 });
  });

  it("calculates black and white contrast", () => {
    expect(getContrastRatio(hexToRgb("#000000"), hexToRgb("#ffffff"))).toBeCloseTo(21, 5);
  });

  it("extracts dominant colors from RGBA pixels", () => {
    const pixels = new Uint8ClampedArray([
      255, 0, 0, 255, 255, 0, 0, 255,
      0, 0, 255, 255, 0, 0, 255, 255,
      255, 255, 255, 0,
    ]);
    const colors = extractDominantColors(pixels, 2);
    expect(colors).toHaveLength(2);
    expect(colors).toContain("#ff0000");
    expect(colors).toContain("#0000ff");
  });

  it("creates a five-color palette", () => {
    const palette = createPalette("#2e5bff");
    expect(palette).toHaveLength(5);
    expect(palette.some((item) => item.hex === "#2e5bff")).toBe(true);
  });
});