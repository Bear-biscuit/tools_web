import { describe, expect, it } from "vitest";
import { formatJson, getJsonStats, minifyJson } from "./formatJson";

describe("formatJson", () => {
  it("formats valid JSON with two-space indentation", () => {
    const result = formatJson('{"name":"Nova","tools":["json"]}');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output).toBe(
        '{\n  "name": "Nova",\n  "tools": [\n    "json"\n  ]\n}',
      );
    }
  });

  it("minifies valid JSON", () => {
    const result = minifyJson('{\n  "name": "Nova"\n}');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output).toBe('{"name":"Nova"}');
  });

  it("reports empty input", () => {
    const result = formatJson("   ");

    expect(result).toEqual({
      ok: false,
      message: "请输入或粘贴 JSON 内容。",
    });
  });

  it("reports invalid JSON", () => {
    const result = formatJson('{"name":}');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
  });

  it("counts characters and lines", () => {
    expect(getJsonStats('{\n  "ok": true\n}')).toEqual({
      characters: 16,
      lines: 3,
    });
  });
});