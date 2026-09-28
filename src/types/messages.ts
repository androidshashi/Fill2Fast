import type { FieldType } from '../core/field-types';

/** The kind of form control a detected field represents. Radio groups are one field. */
export type FieldKind = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file';

/** What Fill2Fast would put into a field, computed against the current profile. */
export type SuggestionStatus =
  /** A value is available and can be filled. */
  | 'ready'
  /** The field already contains exactly the profile value. */
  | 'filled'
  /** The profile has no value for this field. */
  | 'missing'
  /** Sensitive field (salary) and the user has not opted in. */
  | 'blocked'
  /** The profile value does not match any option of a select/radio group. */
  | 'no-option'
  /** Several options match equally well; Fill2Fast will not guess. */
  | 'ambiguous'
  /** The field type could not be determined. */
  | 'unknown';

export interface Suggestion {
  status: SuggestionStatus;
  /** Human-readable value that will be filled (e.g. the option text for a select). */
  displayValue?: string;
  message?: string;
}

/** Serializable description of a detected field, sent from the content script to the popup. */
export interface FieldSummary {
  id: string;
  kind: FieldKind;
  fieldType: FieldType;
  confidence: number;
  /** Best human-readable label found on the page. */
  label: string;
  /** Current value on the page (option text for selects, "checked" state for checkboxes). */
  currentValue: string;
  suggestion: Suggestion;
}

export interface FrameScanResult {
  fields: FieldSummary[];
  /** Origins of visible cross-origin iframes (e.g. an embedded application form) that may need permission. */
  embeddedOrigins: string[];
  url: string;
}

export type FillStatus = 'filled' | 'failed' | 'skipped';

export interface FieldFillResult {
  id: string;
  status: FillStatus;
  message?: string;
}

/** Messages sent over chrome.runtime messaging (content script → open popup). */
export type RuntimeMessage = { type: 'FIELDS_CHANGED' };
