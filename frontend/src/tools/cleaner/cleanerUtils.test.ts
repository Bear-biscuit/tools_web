import { describe, expect, it } from "vitest";
import { cleanText, defaultCleanerOptions } from "./cleanerUtils";

describe("cleaner utils", () => {
  it("trims and collapses spaces", () => {
    expect(cleanText("  hello   world  ", defaultCleanerOptions)).toBe("hello world");
  });

  it("removes empty and duplicate lines", () => {
    expect(cleanText("a\na\n\nb", { ...defaultCleanerOptions, removeEmptyLines: true, removeDuplicateLines: true })).toBe("a\nb");
  });

  it("strips HTML and line breaks", () => {
    expect(cleanText("<p>Hello</p><br>World", { ...defaultCleanerOptions, stripHtml: true, removeLineBreaks: true })).toBe("HelloWorld");
  });

  it("lowercases and removes punctuation", () => {
    expect(cleanText("Hello, WORLD!", { ...defaultCleanerOptions, lowercase: true, removePunctuation: true })).toBe("hello world");
  });
});