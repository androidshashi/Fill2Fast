import {
  AGREEING_SIGNAL_BONUS,
  CONFIDENCE_LEVELS,
  MAX_CONFIDENCE,
  MAX_COVERAGE_PENALTY,
  SIGNAL_WEIGHTS,
  type SignalSource,
} from './constants';

export type ConfidenceLevel = 'very-high' | 'high' | 'possible' | 'unknown';

/** Question-style labels are naturally long, so they are penalized less for low coverage. */
const QUESTION_PENALTY_FACTOR = 0.3;

/**
 * Score a single keyword match.
 *
 * @param coverage fraction of the signal text covered by the keyword (0–1).
 *   "Email" matched by "email" has coverage 1 and gets the full weight;
 *   "Current company website email" matched by "email" is penalized.
 */
export function scoreSignal(source: SignalSource, coverage = 1, question = false): number {
  const clamped = Math.min(1, Math.max(0, coverage));
  const factor = question ? QUESTION_PENALTY_FACTOR : 1;
  const penalty = (1 - clamped) * MAX_COVERAGE_PENALTY * factor;
  return Math.round(SIGNAL_WEIGHTS[source] - penalty);
}

/**
 * Combine per-source scores for one field type: the strongest signal wins and
 * each additional agreeing source adds a small bonus.
 */
export function combineScores(scores: number[]): number {
  const valid = scores.filter((s) => s > 0);
  if (valid.length === 0) return 0;
  const best = Math.max(...valid);
  const bonus = (valid.length - 1) * AGREEING_SIGNAL_BONUS;
  return Math.min(MAX_CONFIDENCE, best + bonus);
}

export function confidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= CONFIDENCE_LEVELS.veryHigh) return 'very-high';
  if (confidence >= CONFIDENCE_LEVELS.high) return 'high';
  if (confidence >= CONFIDENCE_LEVELS.possible) return 'possible';
  return 'unknown';
}

export const CONFIDENCE_LEVEL_LABELS: Record<ConfidenceLevel, string> = {
  'very-high': 'Very high',
  high: 'High',
  possible: 'Possible',
  unknown: 'Unknown',
};
