import { describe, expect, it } from "vitest";
import { convertUnit, unitCategories } from "./unitUtils";

describe("unit utils", () => {
  it("converts length", () => {
    expect(convertUnit("length", 1, "km", "m")).toBe(1000);
    expect(convertUnit("length", 12, "in", "cm")).toBeCloseTo(30.48, 5);
  });

  it("converts data units", () => {
    expect(convertUnit("data", 1, "MB", "KB")).toBe(1024);
  });

  it("converts temperature", () => {
    expect(convertUnit("temperature", 100, "C", "F")).toBe(212);
    expect(convertUnit("temperature", 0, "C", "K")).toBeCloseTo(273.15, 5);
  });

  it("exposes category units", () => {
    expect(Object.keys(unitCategories)).toContain("speed");
  });
});