import { describe, expect, it } from "vitest";
import { convertText, getTextStyles } from "./convertText";

describe("convertText", () => {
  it("returns the original text for normal style", () => {
    expect(convertText("Nova 123", "normal")).toBe("Nova 123");
  });

  it("converts letters to bold unicode", () => {
    expect(convertText("Hello", "bold")).toBe("𝐇𝐞𝐥𝐥𝐨");
  });

  it("converts supported numbers to full width", () => {
    expect(convertText("Nova 2026", "fullWidth")).toBe("Ｎｏｖａ ２０２６");
  });

  it("keeps unsupported characters unchanged", () => {
    expect(convertText("你好 Nova", "bold")).toBe("你好 𝐍𝐨𝐯𝐚");
  });

  it("exposes the reference style list", () => {
    expect(getTextStyles().length).toBeGreaterThan(20);
    expect(getTextStyles().some((style) => style.cname === "fullWidth")).toBe(true);
  });
});