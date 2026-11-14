// Input rules shared by the server actions (and mirrored as maxLength /
// min / max on the form inputs so people get instant feedback).
//
// The browser's form attributes are only a convenience: anyone can call
// a Server Action directly with any values, so the server re-checks
// everything here.

export const LIMITS = {
  eventName: 80,
  teamName: 60,
  teamMembers: 200,
  activityName: 60,
  categoryName: 40,
  joinCode: 100, // generous: people paste the whole link

  teamsPerEvent: 64,
  activitiesPerEvent: 40,
  categoriesPerActivity: 20,

  seedMax: 999,
  matchScoreMax: 9999,
  placementPointsMax: 1000,
  categoryWeightMax: 100,
  judgedScoreMax: 1000,
} as const;

export const ACTIVITY_FORMATS = [
  "ELIMINATION",
  "ROUND_ROBIN",
  "WEIGHTED_SCORE",
] as const;
export type ActivityFormatValue = (typeof ACTIVITY_FORMATS)[number];

export function isActivityFormat(value: string): value is ActivityFormatValue {
  return (ACTIVITY_FORMATS as readonly string[]).includes(value);
}

// Trimmed text, cut to `max` characters. Returns "" when missing.
export function readText(
  formData: FormData,
  key: string,
  max: number
): string {
  const raw = formData.get(key);
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, max);
}

// A whole number within [min, max], or null when blank, not a number,
// fractional, or out of range. Note Number("") is 0, so blank has to be
// checked explicitly or empty boxes would silently count as zero.
export function parseIntInRange(
  raw: FormDataEntryValue | null,
  min: number,
  max: number
): number | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

// Same as parseIntInRange but allows decimals (weights, judged scores,
// placement points are stored as Float).
export function parseNumberInRange(
  raw: FormDataEntryValue | null,
  min: number,
  max: number
): number | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}
