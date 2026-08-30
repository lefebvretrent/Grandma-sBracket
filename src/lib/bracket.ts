// Pure functions for bracket structure — no database access, so they're
// easy to reason about and (later) unit test on their own.

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

// Standard tournament seeding order: returns which seed number occupies
// each position 0..size-1 of the bracket, so that top seeds can only meet
// as late as possible (e.g. size=4 -> [1,4,2,3], meaning round 1 pairs
// seed 1 vs seed 4, and seed 2 vs seed 3).
export function seedOrder(size: number): number[] {
  if (size <= 1) return [1];
  const prev = seedOrder(size / 2);
  const result: number[] = [];
  for (const s of prev) {
    result.push(s);
    result.push(size + 1 - s);
  }
  return result;
}
