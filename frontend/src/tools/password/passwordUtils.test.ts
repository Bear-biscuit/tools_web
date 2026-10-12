import { describe, expect, it } from "vitest";
import {
  calculateEntropyBits,
  defaultPasswordOptions,
  generatePassword,
  getPasswordStrength,
} from "./passwordUtils";

describe("password utils", () => {
  it("uses the requested length and includes every selected character class", () => {
    const password = generatePassword({
      ...defaultPasswordOptions,
      length: 24,
      excludeAmbiguous: false,
    }, () => 0.42);

    expect(password).toHaveLength(24);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/\d/);
    expect(password).toMatch(/[^A-Za-z0-9]/);
  });

  it("removes ambiguous characters when requested", () => {
    const password = generatePassword({
      length: 64,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: false,
      excludeAmbiguous: true,
    }, () => 0.15);

    expect(password).not.toMatch(/[O0oIl1|`'"]/);
  });

  it("requires at least one character class", () => {
    expect(() => generatePassword({
      length: 20,
      uppercase: false,
      lowercase: false,
      numbers: false,
      symbols: false,
      excludeAmbiguous: false,
    })).toThrow();
  });

  it("calculates entropy and strength", () => {
    const entropy = calculateEntropyBits(20, defaultPasswordOptions);
    expect(entropy).toBeGreaterThan(100);
    expect(getPasswordStrength(entropy)).toEqual({
      score: 4,
      label: "很强",
      key: "strong",
    });
    expect(getPasswordStrength(32).key).toBe("weak");
  });
});