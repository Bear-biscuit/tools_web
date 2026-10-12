import { describe, expect, it } from "vitest";
import { diffLines } from "./diffUtils";

describe("diff utils", () => {
  it("marks added and removed lines", () => {
    const result = diffLines("a\nb\nc", "a\nB\nc\nd");
    expect(result.removed).toBe(1);
    expect(result.added).toBe(2);
    expect(result.unchanged).toBe(2);
    expect(result.lines.map((line) => line.type)).toEqual([
      "same", "removed", "added", "same", "added",
    ]);
  });

  it("returns all unchanged for identical text", () => {
    const result = diffLines("one\ntwo", "one\ntwo");
    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);
    expect(result.unchanged).toBe(2);
  });
});