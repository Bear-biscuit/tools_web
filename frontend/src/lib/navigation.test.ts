import { describe, expect, it } from "vitest";
import { normalizeAppPath } from "./navigation";

describe("normalizeAppPath", () => {
  it("keeps the root path", () => {
    expect(normalizeAppPath("/")).toBe("/");
  });

  it("removes trailing slashes from application routes", () => {
    expect(normalizeAppPath("/admin/")).toBe("/admin");
    expect(normalizeAppPath("/account/")).toBe("/account");
    expect(normalizeAppPath("/tools/json/")).toBe("/tools/json");
  });

  it("preserves query strings and hashes", () => {
    expect(normalizeAppPath("/tools/json/?q=1#result")).toBe("/tools/json?q=1#result");
  });
});