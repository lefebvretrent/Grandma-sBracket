import { describe, expect, it } from "vitest";
import { nextPowerOfTwo, seedOrder } from "@/lib/bracket";

describe("nextPowerOfTwo", () => {
  it("rounds a team count up to the bracket size", () => {
    expect([1, 2, 3, 4, 5, 8, 9, 16, 17, 64].map(nextPowerOfTwo)).toEqual([
      1, 2, 4, 4, 8, 8, 16, 16, 32, 64,
    ]);
  });
});

describe("seedOrder", () => {
  it("matches the standard seeding for small brackets", () => {
    expect(seedOrder(2)).toEqual([1, 2]);
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it.each([2, 4, 8, 16, 32, 64])(
    "uses every seed once and pairs high with low (size %i)",
    (size) => {
      const order = seedOrder(size);
      expect([...order].sort((a, b) => a - b)).toEqual(
        Array.from({ length: size }, (_, i) => i + 1)
      );
      // Round 1 always pairs seeds that add up to size + 1 (1 v 8, 2 v 7...).
      for (let i = 0; i < size; i += 2) {
        expect(order[i] + order[i + 1]).toBe(size + 1);
      }
    }
  );

  it("keeps the top two seeds in opposite halves", () => {
    const order = seedOrder(16);
    expect(order.indexOf(1)).toBeLessThan(8);
    expect(order.indexOf(2)).toBeGreaterThanOrEqual(8);
  });
});
