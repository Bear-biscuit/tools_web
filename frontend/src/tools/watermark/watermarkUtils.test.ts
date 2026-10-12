import { describe, expect, it } from "vitest";
import { calculateWatermarkPosition, fitWithin } from "./watermarkUtils";

describe("watermark utils", () => {
  it("positions watermarks in the corners and center", () => {
    const container = { width: 1000, height: 800 };
    const item = { width: 100, height: 50 };
    expect(calculateWatermarkPosition(container, item, "top-left", 20)).toEqual({ x: 20, y: 20 });
    expect(calculateWatermarkPosition(container, item, "bottom-right", 20)).toEqual({ x: 880, y: 730 });
    expect(calculateWatermarkPosition(container, item, "center")).toEqual({ x: 450, y: 375 });
  });

  it("fits large images without upscaling", () => {
    expect(fitWithin(2000, 1000, 1000, 800)).toEqual({ width: 1000, height: 500 });
    expect(fitWithin(500, 400, 1000, 800)).toEqual({ width: 500, height: 400 });
  });
});