import { describe, expect, it } from "vitest";
import {
  isActivityFormat,
  parseIntInRange,
  parseNumberInRange,
  readText,
} from "@/lib/validation";
import { generateJoinCode } from "@/lib/join-code";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("readText", () => {
  it("trims and cuts to the limit", () => {
    expect(readText(form({ name: "  The Smashers  " }), "name", 60)).toBe(
      "The Smashers"
    );
    expect(readText(form({ name: "abcdef" }), "name", 3)).toBe("abc");
  });

  it("returns an empty string when the field is missing", () => {
    expect(readText(form({}), "name", 60)).toBe("");
  });
});

describe("parseIntInRange", () => {
  it("accepts whole numbers inside the range", () => {
    expect(parseIntInRange("0", 0, 10)).toBe(0);
    expect(parseIntInRange(" 7 ", 0, 10)).toBe(7);
  });

  it("rejects blanks, decimals, text and out-of-range values", () => {
    for (const raw of ["", "  ", "1.5", "abc", "-1", "11", null]) {
      expect(parseIntInRange(raw, 0, 10)).toBeNull();
    }
  });
});

describe("parseNumberInRange", () => {
  it("accepts decimals", () => {
    expect(parseNumberInRange("2.5", 0, 10)).toBe(2.5);
  });

  it("rejects blanks, text, infinity and out-of-range values", () => {
    for (const raw of ["", "abc", "Infinity", "-0.5", "10.1", null]) {
      expect(parseNumberInRange(raw, 0, 10)).toBeNull();
    }
  });
});

describe("isActivityFormat", () => {
  it("only allows the three known formats", () => {
    expect(isActivityFormat("ELIMINATION")).toBe(true);
    expect(isActivityFormat("ROUND_ROBIN")).toBe(true);
    expect(isActivityFormat("WEIGHTED_SCORE")).toBe(true);
    expect(isActivityFormat("SWISS")).toBe(false);
  });
});

describe("generateJoinCode", () => {
  it("makes 6-character codes without look-alike characters", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateJoinCode()).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
    }
  });
});
