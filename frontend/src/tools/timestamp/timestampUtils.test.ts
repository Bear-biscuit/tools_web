import { describe, expect, it } from "vitest";
import {
  getRelativeTime,
  getTimestampDetails,
  parseDateTimeLocal,
  parseTimestampInput,
  toDateTimeLocalValue,
} from "./timestampUtils";

describe("timestamp utils", () => {
  it("detects seconds and converts to milliseconds", () => {
    expect(parseTimestampInput("1700000000")).toMatchObject({
      milliseconds: 1_700_000_000_000,
      unit: "seconds",
      source: "numeric",
    });
  });

  it("keeps millisecond timestamps", () => {
    expect(parseTimestampInput("1700000000123")).toMatchObject({
      milliseconds: 1_700_000_000_123,
      unit: "milliseconds",
    });
  });

  it("accepts standard date text", () => {
    expect(parseTimestampInput("2023-11-14T22:13:20.000Z").milliseconds).toBe(1_700_000_000_000);
  });

  it("rejects empty and invalid input", () => {
    expect(() => parseTimestampInput("")).toThrow();
    expect(() => parseTimestampInput("not-a-date")).toThrow();
  });

  it("formats timestamp details", () => {
    const details = getTimestampDetails(1_700_000_000_000);
    expect(details.seconds).toBe("1700000000");
    expect(details.milliseconds).toBe("1700000000000");
    expect(details.iso).toBe("2023-11-14T22:13:20.000Z");
    expect(details.relative).toContain("前");
  });

  it("parses and formats local datetime input", () => {
    const value = "2024-01-02T03:04:05";
    expect(toDateTimeLocalValue(parseDateTimeLocal(value))).toBe(value);
  });

  it("formats relative time", () => {
    expect(getRelativeTime(61_000, 1_000)).toBe("1分钟后");
  });
});