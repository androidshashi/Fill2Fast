/**
 * Deterministic field classification. Pure functions over extracted signals,
 * no DOM access, so it can be unit tested directly.
 */
import { combineScores, scoreSignal } from '../core/confidence';
import {
  AMBIGUITY_MARGIN,
  AMBIGUITY_PENALTY,
  CONFIDENCE_LEVELS,
  MAX_SIGNAL_TEXT_LENGTH,
  SIGNAL_WEIGHTS,
  type SignalSource,
} from '../core/constants';
import { FIELD_RULES, TEXT_KINDS, type FieldRule } from '../core/field-rules';
import { FieldType } from '../core/field-types';
import { compileKeyword, findKeyword, matchesKeyword, spanCoverage, tokenize, type CompiledKeyword } from '../core/normalize';
import type { FieldKind } from '../types/messages';

/** Raw signals collected from a form control. */
export interface FieldSignals {
  kind: FieldKind;
  inputType?: string;
  autocomplete?: string;
  name?: string;
  id?: string;
  label?: string;
  ariaLabel?: string;
  placeholder?: string;
  /** Test/automation attributes such as data-automation-id or data-qa. */
  dataAttribute?: string;
  nearbyText?: string;
}

export interface Classification {
  fieldType: FieldType;
  confidence: number;
  /** The strongest signal behind the classification. */
  source: SignalSource | null;
}

/** Text signals in priority order. */
const TEXT_SIGNALS: Array<[SignalSource, keyof FieldSignals]> = [
  ['name', 'name'],
  ['id', 'id'],
  ['label', 'label'],
  ['ariaLabel', 'ariaLabel'],
  ['placeholder', 'placeholder'],
  ['dataAttribute', 'dataAttribute'],
  ['nearbyText', 'nearbyText'],
];

/** Autocomplete tokens that qualify the field but do not identify it. */
const AUTOCOMPLETE_MODIFIERS = /^(section-.*|shipping|billing|home|work|mobile|fax|pager|webauthn)$/;

interface CompiledRule {
  rule: FieldRule;
  kinds: FieldKind[];
  keywords: CompiledKeyword[];
  exclude: CompiledKeyword[];
}

const COMPILED_RULES: CompiledRule[] = FIELD_RULES.map((rule) => ({
  rule,
  kinds: rule.kinds ?? TEXT_KINDS,
  keywords: rule.keywords.map(compileKeyword),
  exclude: (rule.exclude ?? []).map(compileKeyword),
}));

function autocompleteTokens(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t && !AUTOCOMPLETE_MODIFIERS.test(t));
}

function signalTokens(signals: FieldSignals): Array<[SignalSource, string[]]> {
  const result: Array<[SignalSource, string[]]> = [];
  for (const [source, key] of TEXT_SIGNALS) {
    const raw = signals[key];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const tokens = tokenize(raw.slice(0, MAX_SIGNAL_TEXT_LENGTH));
    if (tokens.length > 0) result.push([source, tokens]);
  }
  return result;
}

interface Candidate {
  type: FieldType;
  score: number;
  source: SignalSource;
}

function scoreRule(compiled: CompiledRule, signals: FieldSignals, texts: Array<[SignalSource, string[]]>, autocomplete: string[]): Candidate | null {
  const { rule } = compiled;
  const bySource = new Map<SignalSource, number>();
  let excluded = false;

  if (rule.autocomplete?.some((token) => autocomplete.includes(token))) {
    bySource.set('autocomplete', SIGNAL_WEIGHTS.autocomplete);
  }

  for (const [source, tokens] of texts) {
    if (compiled.exclude.some((kw) => matchesKeyword(tokens, kw))) {
      excluded = true;
      continue;
    }
    const spans: Array<[number, number]> = [];
    for (const keyword of compiled.keywords) {
      const span = findKeyword(tokens, keyword);
      if (span) spans.push(span);
    }
    if (spans.length > 0) bySource.set(source, scoreSignal(source, spanCoverage(tokens, spans), rule.question));
  }

  // type="email" is strong evidence, unless the label says it is someone else's email.
  if (!excluded && signals.inputType && rule.inputTypes?.includes(signals.inputType.toLowerCase())) {
    bySource.set('inputType', SIGNAL_WEIGHTS.inputType);
  }

  if (bySource.size === 0) return null;
  let topSource: SignalSource = 'nearbyText';
  let topScore = -1;
  for (const [source, score] of bySource) {
    if (score > topScore) {
      topScore = score;
      topSource = source;
    }
  }
  return { type: rule.type, score: combineScores([...bySource.values()]), source: topSource };
}

export function classifyField(signals: FieldSignals): Classification {
  const texts = signalTokens(signals);
  const autocomplete = autocompleteTokens(signals.autocomplete);

  const candidates: Candidate[] = [];
  for (const compiled of COMPILED_RULES) {
    if (!compiled.kinds.includes(signals.kind)) continue;
    const candidate = scoreRule(compiled, signals, texts, autocomplete);
    if (candidate) candidates.push(candidate);
  }

  if (candidates.length === 0) return { fieldType: FieldType.UNKNOWN, confidence: 0, source: null };

  candidates.sort((a, b) => b.score - a.score);
  const [top, runnerUp] = candidates;
  let confidence = top.score;

  // Two different interpretations that score about the same: don't trust either.
  if (runnerUp && top.source !== 'autocomplete' && runnerUp.score >= top.score - AMBIGUITY_MARGIN) {
    confidence -= AMBIGUITY_PENALTY;
  }

  if (confidence < CONFIDENCE_LEVELS.possible) {
    return { fieldType: FieldType.UNKNOWN, confidence, source: top.source };
  }
  return { fieldType: top.type, confidence, source: top.source };
}
