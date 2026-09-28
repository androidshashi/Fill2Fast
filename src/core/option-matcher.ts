/**
 * Matching profile values to <select> options and radio buttons.
 *
 * Rule: pick an option only when exactly one option matches at the most
 * specific matching tier. If several match, report ambiguity and let the user
 * choose — never guess.
 */
import { normalizeText } from './normalize';

export interface OptionLike {
  text: string;
  value: string;
}

export type OptionMatch =
  | { status: 'match'; index: number }
  | { status: 'none' }
  | { status: 'ambiguous'; indices: number[] };

const PLACEHOLDER_PATTERN = /^(select|choose|please select|please choose|pick|none selected|select one|select an option|choose one|choose an option|\-+|\.\.\.)$/;
const PLACEHOLDER_PREFIX = /^(select|choose|please select|please choose) /;

/** "Select…", "-- Choose --", or an empty option. */
export function isPlaceholderOption(option: OptionLike): boolean {
  const text = normalizeText(option.text);
  if (!text && !option.value.trim()) return true;
  if (!text) return false;
  return PLACEHOLDER_PATTERN.test(text) || PLACEHOLDER_PREFIX.test(text);
}

/** Common alternate spellings. Each group is treated as one value. */
const ALIAS_GROUPS: string[][] = [
  ['united states', 'united states of america', 'usa', 'us', 'u s a', 'u s', 'america'],
  ['united kingdom', 'uk', 'u k', 'great britain', 'britain', 'england'],
  ['united arab emirates', 'uae', 'u a e'],
  ['india', 'bharat', 'in'],
  ['germany', 'deutschland', 'de'],
  ['netherlands', 'the netherlands', 'holland', 'nl'],
  ['south korea', 'korea republic of', 'republic of korea', 'korea'],
  ['canada', 'ca'],
  ['australia', 'au'],
  ['singapore', 'sg'],
  ['full time', 'fulltime', 'full time employee', 'permanent'],
  ['part time', 'parttime'],
  ['immediately', 'immediate', 'immediate joiner'],
];

const ALIAS_INDEX = new Map<string, string[]>();
for (const group of ALIAS_GROUPS) for (const alias of group) ALIAS_INDEX.set(alias, group);

function aliasesOf(normalized: string): string[] {
  return ALIAS_INDEX.get(normalized) ?? [normalized];
}

function containsWords(haystack: string, needle: string): boolean {
  return ` ${haystack} `.includes(` ${needle} `);
}

type Tier = (option: { text: string; value: string }) => boolean;

function pickUnique(options: OptionLike[], tiers: Tier[]): OptionMatch {
  const candidates = options
    .map((option, index) => ({ index, text: normalizeText(option.text), value: normalizeText(option.value), option }))
    .filter((c) => !isPlaceholderOption(c.option));

  for (const tier of tiers) {
    const hits = candidates.filter((c) => tier(c));
    // Duplicate options with identical text (e.g. repeated "India") still count as ambiguous.
    if (hits.length === 1) return { status: 'match', index: hits[0].index };
    if (hits.length > 1) return { status: 'ambiguous', indices: hits.map((h) => h.index) };
  }
  return { status: 'none' };
}

/** Parse numeric ranges such as "3-5 years", "5+ years", "Less than 1 year", "10 or more". */
export function parseRange(text: string): { min: number; max: number } | null {
  const t = text
    .toLowerCase()
    .replace(/[\u2012-\u2015]/g, '-')
    .replace(/\bto\b/g, ' - ')
    .replace(/[^a-z0-9.+<\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const num = String.raw`(\d+(?:\.\d+)?)`;
  let m = t.match(new RegExp(String.raw`^(?:less than|under|below|upto|up to|<)\s*${num}`));
  if (m) return { min: 0, max: Number(m[1]) - 0.001 };
  m = t.match(new RegExp(String.raw`^${num}\s*(?:\+|plus|or more|and above|above)`)) ?? t.match(new RegExp(String.raw`^(?:more than|over|above)\s*${num}`));
  if (m) return { min: Number(m[1]), max: Infinity };
  m = t.match(new RegExp(String.raw`^${num}\s*(?:-|\s)\s*${num}\b`));
  if (m) return { min: Number(m[1]), max: Number(m[2]) };
  m = t.match(new RegExp(String.raw`^${num}(?:\s|$)`));
  if (m) return { min: Number(m[1]), max: Number(m[1]) };
  return null;
}

function inRange(value: number, range: { min: number; max: number }): boolean {
  return value >= range.min && value <= range.max;
}

export interface MatchOptions {
  /** Allow matching a number of years against range options ("3-5 years"). */
  numeric?: boolean;
}

export function matchOption(options: OptionLike[], target: string, { numeric = false }: MatchOptions = {}): OptionMatch {
  const wanted = normalizeText(target);
  if (!wanted) return { status: 'none' };
  const aliases = aliasesOf(wanted);

  const tiers: Tier[] = [
    (o) => o.text === wanted,
    (o) => o.value === wanted,
    (o) => aliases.includes(o.text) || aliases.includes(o.value),
    // "India (+91)", "India - IN": the option contains the whole value on word boundaries.
    (o) => wanted.length >= 3 && containsWords(o.text, wanted),
  ];

  if (numeric) {
    const years = Number(target.trim());
    if (Number.isFinite(years)) {
      tiers.push((o) => {
        const range = parseRange(o.text);
        return range !== null && inRange(years, range);
      });
    }
  }

  return pickUnique(options, tiers);
}

const YES = /^(yes|y|true)$|^yes /;
const NO = /^(no|n|false)$|^no /;

/** Pick the "Yes" or "No" option. Ambiguous or unfamiliar option sets are left alone. */
export function matchBooleanOption(options: OptionLike[], answer: boolean): OptionMatch {
  const pattern = answer ? YES : NO;
  return pickUnique(options, [(o) => pattern.test(o.text) || (!o.text && pattern.test(o.value))]);
}
