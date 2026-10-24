// Rating scale used by both the self-assessment and the 360 rater survey.

export const RATING_SCALE = [
  { value: 1, label: 'Not yet', description: 'Rarely shows this. Needs significant development.' },
  { value: 2, label: 'Developing', description: 'Shows this sometimes, mostly in familiar or low-pressure situations.' },
  { value: 3, label: 'Solid', description: 'Shows this reliably in day-to-day work.' },
  { value: 4, label: 'Strong', description: 'Shows this consistently, including under pressure, and others notice it.' },
  { value: 5, label: 'Role model', description: 'Exceptional. Others learn this from them.' },
];

// Raters can skip a skill they have not seen in action; it is left out of the average.
export const NOT_OBSERVED = 'n/a';

export const selfQuestion = (skill) => `How well does this describe you? “${skill.statement}”`;

export const raterQuestion = (skill, name) => `How well does this describe ${name}? “${skill.statement}”`;

// Parses one form value. Returns 1–5, NOT_OBSERVED (only when allowed), or null if invalid/missing.
export function parseRating(value, { allowNotObserved = false } = {}) {
  if (allowNotObserved && value === NOT_OBSERVED) return NOT_OBSERVED;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}
