import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn utility", () => {
  it("merges multiple class strings", () => {
    expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
  });

  it("handles conditional classes via clsx syntax", () => {
    const result = cn("base", false && "hidden", "visible");
    expect(result).toBe("base visible");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  it("handles undefined and null inputs gracefully", () => {
    expect(cn("base", undefined, null, "extra")).toBe("base extra");
  });

  it("handles empty string and no arguments", () => {
    expect(cn("")).toBe("");
    expect(cn()).toBe("");
  });

  it("merges array inputs", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });
});
