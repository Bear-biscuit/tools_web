import { describe, expect, it } from "vitest";
import { generateIds, generateShortId, generateUuid } from "./idUtils";

describe("id utils", () => {
  it("generates UUID v4 strings", () => {
    expect(generateUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("generates short ids with the requested length", () => {
    expect(generateShortId(12)).toHaveLength(12);
  });

  it("generates counts, prefixes, and uppercase hex ids", () => {
    const ids = generateIds({ kind: "hex", count: 3, length: 10, uppercase: true, prefix: "id_" });
    expect(ids).toHaveLength(3);
    expect(ids.every((id) => /^id_[0-9A-F]{10}$/.test(id))).toBe(true);
  });
});