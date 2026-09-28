/** Keys used in chrome.storage.local. Only the storage layer should use these. */
export const STORAGE_KEYS = {
  profile: 'fill2fast.profile',
  settings: 'fill2fast.settings',
  resume: 'fill2fast.resume',
  resumeMeta: 'fill2fast.resumeMeta',
} as const;

/** Where a classification signal came from, in priority order. */
export type SignalSource =
  | 'autocomplete'
  | 'inputType'
  | 'name'
  | 'id'
  | 'label'
  | 'ariaLabel'
  | 'placeholder'
  | 'dataAttribute'
  | 'nearbyText';

/** Base confidence for a keyword match from each signal source. */
export const SIGNAL_WEIGHTS: Record<SignalSource, number> = {
  autocomplete: 98,
  inputType: 92,
  name: 90,
  id: 88,
  label: 85,
  ariaLabel: 84,
  dataAttribute: 82,
  placeholder: 80,
  nearbyText: 76,
};

/** Confidence buckets (inclusive lower bounds). */
export const CONFIDENCE_LEVELS = {
  veryHigh: 90,
  high: 75,
  possible: 60,
} as const;

export const DEFAULT_AUTO_SELECT_THRESHOLD = 75;
export const MIN_AUTO_SELECT_THRESHOLD = 60;
export const MAX_AUTO_SELECT_THRESHOLD = 95;

/** Bonus for every additional independent signal that agrees on the same type. */
export const AGREEING_SIGNAL_BONUS = 3;
export const MAX_CONFIDENCE = 99;

/** Maximum penalty when a keyword covers only a small part of a long label. */
export const MAX_COVERAGE_PENALTY = 18;

/** Penalty applied when two different field types score within `AMBIGUITY_MARGIN`. */
export const AMBIGUITY_MARGIN = 6;
export const AMBIGUITY_PENALTY = 15;

/** Resume files larger than this are rejected (chrome.storage.local has a 10 MB quota). */
export const MAX_RESUME_BYTES = 4 * 1024 * 1024;

/** Accepted resume file extensions. */
export const RESUME_ACCEPT = '.pdf,.doc,.docx,.rtf,.txt,.odt';

/** Nearby text longer than this is truncated before classification. */
export const MAX_SIGNAL_TEXT_LENGTH = 200;

/** Debounce for processing DOM mutations in the content script. */
export const MUTATION_DEBOUNCE_MS = 250;
