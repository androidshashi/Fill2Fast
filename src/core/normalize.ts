/**
 * Text normalization shared by field classification and option matching.
 */

/** Filler words that carry no meaning for classification ("Please enter your email"). */
const STOP_WORDS = new Set([
  'please', 'enter', 'your', 'yours', 'the', 'a', 'an', 'here', 'input', 'provide', 'fill',
  'required', 'optional', 'eg', 'ie', 'etc', 'my', 'what', 'is',
]);

function stripDiacritics(value: string): string {
  return value.normalize('NFKD').replace(/[̀-ͯ]/g, '');
}

/**
 * Lowercase, strip accents and punctuation, collapse whitespace.
 * "  INDIA " → "india", "Côte d'Ivoire" → "cote d ivoire".
 */
export function normalizeText(value: string | null | undefined): string {
  if (!value) return '';
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim();
}

/**
 * Split an attribute or label into lowercase word tokens.
 * Handles camelCase, snake_case, kebab-case and bracket notation:
 * "job_application[firstName]" → ["job", "application", "first", "name"].
 */
export function tokenize(value: string | null | undefined, { keepStopWords = false } = {}): string[] {
  if (!value) return [];
  const spaced = stripDiacritics(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!spaced) return [];
  const tokens = spaced.split(' ');
  return keepStopWords ? tokens : tokens.filter((t) => !STOP_WORDS.has(t));
}

/** A keyword ready for matching: its compact form ("first name" → "firstname"). */
export interface CompiledKeyword {
  compact: string;
  /** Must match the entire signal rather than a part of it. */
  exact: boolean;
}

/** Compile a keyword from rule configuration. A leading "=" marks an exact-match keyword. */
export function compileKeyword(keyword: string): CompiledKeyword {
  const exact = keyword.startsWith('=');
  const compact = tokenize(exact ? keyword.slice(1) : keyword).join('');
  return { compact, exact };
}

/**
 * Find `keyword` in `tokens` on word boundaries. Returns the matched token
 * range [start, end] (inclusive) or null.
 *
 * Tokens are compared in compact form so that "first name", "firstname",
 * "first_name" and "firstName" are all equivalent, while "state" does not
 * match inside "statement".
 */
export function findKeyword(tokens: string[], keyword: CompiledKeyword): [number, number] | null {
  if (!keyword.compact || tokens.length === 0) return null;
  if (keyword.exact) return tokens.join('') === keyword.compact ? [0, tokens.length - 1] : null;
  for (let start = 0; start < tokens.length; start++) {
    let joined = '';
    for (let end = start; end < tokens.length; end++) {
      joined += tokens[end];
      if (joined === keyword.compact) return [start, end];
      if (joined.length >= keyword.compact.length || !keyword.compact.startsWith(joined)) break;
    }
  }
  return null;
}

export function matchesKeyword(tokens: string[], keyword: CompiledKeyword): boolean {
  return findKeyword(tokens, keyword) !== null;
}

/**
 * Fraction of the signal text (by characters) covered by the given token
 * ranges. Overlapping ranges are counted once, so "Location (City)" matched by
 * both "location" and "city" is fully covered.
 */
export function spanCoverage(tokens: string[], spans: Array<[number, number]>): number {
  const total = tokens.join('').length;
  if (total === 0) return 0;
  const covered = new Set<number>();
  for (const [start, end] of spans) for (let i = start; i <= end; i++) covered.add(i);
  let length = 0;
  for (const i of covered) length += tokens[i].length;
  return Math.min(1, length / total);
}
