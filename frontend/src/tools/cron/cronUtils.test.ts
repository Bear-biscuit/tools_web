import { describe, expect, it } from "vitest";
import {
  buildCronExpression,
  createDefaultCronState,
  getNextCronRuns,
  parseCronExpression,
} from "./cronUtils";

describe("cron utils", () => {
  it("builds the default expression", () => {
    expect(buildCronExpression(createDefaultCronState())).toBe("* * * * * ?");
  });

  it("parses five-field cron as minute-based cron", () => {
    const state = parseCronExpression("*/5 9 * * 1-5");
    expect(state.second.value).toBe("0");
    expect(state.minute.value).toBe("*/5");
    expect(state.hour.value).toBe("9");
    expect(state.weekday.value).toBe("1-5");
    expect(buildCronExpression(state)).toBe("0 */5 9 * * 1-5");
  });

  it("returns the next execution times", () => {
    const runs = getNextCronRuns(
      "0 0 9 * * ?",
      "UTC",
      2,
      new Date("2026-01-01T08:00:00.000Z"),
    );
    expect(runs).toHaveLength(2);
    expect(runs[0].toISOString()).toBe("2026-01-01T09:00:00.000Z");
    expect(runs[1].toISOString()).toBe("2026-01-02T09:00:00.000Z");
  });

  it("supports last day and weekday ranges", () => {
    const lastDay = getNextCronRuns("0 0 23 L * ?", "UTC", 1, new Date("2026-01-01T00:00:00.000Z"));
    const weekdays = getNextCronRuns("0 0 9 ? * 1-5", "UTC", 1, new Date("2026-01-02T00:00:00.000Z"));
    expect(lastDay[0].toISOString()).toBe("2026-01-31T23:00:00.000Z");
    expect(weekdays[0].toISOString()).toBe("2026-01-02T09:00:00.000Z");
  });

  it("filters future year expressions", () => {
    const runs = getNextCronRuns(
      "0 0 9 1 1 ? 2027",
      "UTC",
      1,
      new Date("2026-01-01T00:00:00.000Z"),
    );
    expect(runs[0].toISOString()).toBe("2027-01-01T09:00:00.000Z");
  });
});
