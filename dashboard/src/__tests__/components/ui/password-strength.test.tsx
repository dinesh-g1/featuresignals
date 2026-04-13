import { describe, it, expect } from "vitest";
import { getPasswordStrength, isPasswordStrong } from "@/components/ui/password-strength";

describe("getPasswordStrength", () => {
  it("returns 'none' for empty password", () => {
    const result = getPasswordStrength("");
    expect(result.score).toBe(0);
    expect(result.level).toBe("none");
    expect(result.checks.every((c) => !c.met)).toBe(true);
  });

  it("returns 'weak' for short password", () => {
    const result = getPasswordStrength("ab");
    expect(result.level).toBe("weak");
  });

  it("returns 'fair' for password with 3 criteria met", () => {
    const result = getPasswordStrength("Abcdefgh");
    expect(result.score).toBe(3);
    expect(result.level).toBe("fair");
  });

  it("returns 'good' for password with 4 criteria met", () => {
    const result = getPasswordStrength("Abcdefg1");
    expect(result.score).toBe(4);
    expect(result.level).toBe("good");
  });

  it("returns 'strong' for password with all 5 criteria met", () => {
    const result = getPasswordStrength("Abcdefg1!");
    expect(result.score).toBe(5);
    expect(result.level).toBe("strong");
  });
});

describe("isPasswordStrong", () => {
  it("returns false for empty password", () => {
    expect(isPasswordStrong("")).toBe(false);
  });

  it("returns false for weak password", () => {
    expect(isPasswordStrong("weak")).toBe(false);
  });

  it("returns true for strong password", () => {
    expect(isPasswordStrong("StrongP@ss1")).toBe(true);
  });
});
