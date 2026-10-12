import { describe, expect, it } from "vitest";
import { compareHash, hashText } from "./hashUtils";

describe("hash utils", () => {
  it("hashes text with SHA-256", async () => {
    expect(await hashText("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("supports other SHA algorithms", async () => {
    expect(await hashText("", "SHA-1")).toBe("da39a3ee5e6b4b0d3255bfef95601890afd80709");
  });
});
describe("hash comparison", () => {
  it("normalizes separators and case", async () => {
    const digest = await hashText("Bocchi");
    expect(compareHash(digest.toUpperCase(), digest)).toBe("match");
    expect(compareHash(digest, "not-a-hash")).toBe("mismatch");
    expect(compareHash(digest, " ")).toBe("empty");
  });
});