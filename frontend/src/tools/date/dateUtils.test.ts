import { describe, expect, it } from "vitest";
import { addDays, countBusinessDays, getDateDifference, toDateInputValue } from "./dateUtils";

describe("date utils", () => {
  it("adds and subtracts calendar days", () => {
    expect(addDays("2024-01-31", 1)).toBe("2024-02-01");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
  });

  it("counts weekdays only", () => {
    expect(countBusinessDays("2024-01-01", "2024-01-08")).toBe(5);
  });

  it("calculates date differences", () => {
    expect(getDateDifference("2024-01-01", "2024-01-08")).toMatchObject({ days: 7, weeks: 1, businessDays: 5 });
  });

  it("formats local date values", () => {
    expect(toDateInputValue(new Date(2024, 0, 2))).toBe("2024-01-02");
  });
});