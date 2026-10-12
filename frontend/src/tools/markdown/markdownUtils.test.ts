import { describe, expect, it } from "vitest";
import { getMarkdownStats, markdownToPlainText } from "./markdownUtils";

describe("markdown utils", () => {
  it("counts words, lines, and reading time", () => {
    const stats = getMarkdownStats("# Hello Bocchi\n\nThis is a tool.");
    expect(stats.lines).toBe(3);
    expect(stats.words).toBeGreaterThan(4);
    expect(stats.readingMinutes).toBe(1);
  });

  it("extracts readable text", () => {
    expect(markdownToPlainText("# Title\n\n**Bold** [link](https://example.com)")).toBe(
      "Title\n\nBold link",
    );
  });
});