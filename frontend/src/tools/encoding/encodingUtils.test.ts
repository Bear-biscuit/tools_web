import { describe, expect, it } from "vitest";
import {
  decodeBase64,
  decodeUrl,
  encodeBase64,
  encodeUrl,
} from "./encodingUtils";

describe("encoding utils", () => {
  it("round-trips UTF-8 text through standard Base64", () => {
    const source = "Bocchi 工具台：你好";
    expect(decodeBase64(encodeBase64(source))).toBe(source);
  });

  it("creates URL-safe Base64 without padding", () => {
    const encoded = encodeBase64("???>>>", "url");
    expect(encoded).not.toMatch(/[+/=]/);
    expect(decodeBase64(encoded, "url")).toBe("???>>>");
  });

  it("rejects malformed Base64", () => {
    expect(() => decodeBase64("!!!!")).toThrow();
  });

  it("encodes URL components and full URLs differently", () => {
    const source = "https://example.com/a path?q=你好&next=/x";
    expect(encodeUrl(source, "component")).toContain("%3A%2F%2F");
    expect(encodeUrl(source, "full")).toContain("https://example.com/a%20path");
    expect(decodeUrl(encodeUrl(source, "component"))).toBe(source);
  });

  it("reports malformed URL escapes", () => {
    expect(() => decodeUrl("%E4%BD")).toThrow();
  });
});