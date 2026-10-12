import { describe, expect, it } from "vitest";
import { buildMeetingTimes, getTimeZoneOffsetMinutes, getZonedTime } from "./timezoneUtils";

describe("timezone utils", () => {
  const utc = new Date("2024-01-01T00:00:00.000Z");

  it("formats a time in a requested zone", () => {
    const result = getZonedTime(utc, "Asia/Shanghai", "UTC");
    expect(result.formatted).toContain("2024/01/01");
    expect(result.formatted).toContain("08:00");
    expect(result.dayOffset).toBe(0);
  });

  it("calculates UTC offsets", () => {
    expect(getTimeZoneOffsetMinutes(utc, "UTC")).toBe(0);
    expect(getTimeZoneOffsetMinutes(utc, "Asia/Shanghai")).toBe(480);
  });

  it("builds multiple zone results", () => {
    const results = buildMeetingTimes(utc, ["UTC", "Asia/Tokyo"]);
    expect(results).toHaveLength(2);
    expect(results[1].timeZone).toBe("Asia/Tokyo");
  });
});