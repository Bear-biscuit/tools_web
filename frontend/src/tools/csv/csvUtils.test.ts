import { describe, expect, it } from "vitest";
import { csvToJson, jsonToCsv, parseCsv } from "./csvUtils";

describe("csv utils", () => {
  it("parses quoted commas and escaped quotes", () => {
    expect(parseCsv('name,note\nBocchi,"tools, music"\nA,"say ""hi"""')).toEqual([
      ["name", "note"], ["Bocchi", "tools, music"], ["A", 'say "hi"'],
    ]);
  });

  it("converts CSV to JSON objects", () => {
    expect(csvToJson("name,age\nBocchi,2")).toEqual([{ name: "Bocchi", age: "2" }]);
  });

  it("converts object arrays to CSV", () => {
    expect(jsonToCsv([{ name: "Bocchi", note: "a,b" }, { name: "Nova", note: "ok" }])).toBe(
      'name,note\nBocchi,"a,b"\nNova,ok',
    );
  });

  it("rejects scalar JSON", () => {
    expect(() => jsonToCsv(["one", "two"])).toThrow();
  });
});