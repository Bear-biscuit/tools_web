import { describe, expect, it } from "vitest";
import { replaceRegex, runRegex } from "./regexUtils";

describe("regex utils", () => {
  it("finds global matches and groups", () => {
    const result = runRegex("(\\w+)@(\\w+)", "i", "A@B c@d");
    expect(result.error).toBe("");
    expect(result.matches).toHaveLength(2);
    expect(result.matches[0].groups).toEqual(["A", "B"]);
  });

  it("handles invalid patterns", () => {
    expect(runRegex("([", "g", "text").error).not.toBe("");
  });

  it("replaces matches", () => {
    expect(replaceRegex("\\d+", "g", "a1 b22", "#")).toBe("a# b#");
  });
});