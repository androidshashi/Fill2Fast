import { FieldType } from './field-types';
import type { FieldSummary } from '../types/messages';

/** Whether the user can choose to fill this field at all. */
export function isSelectable(field: FieldSummary): boolean {
  return field.fieldType !== FieldType.UNKNOWN && field.suggestion.status === 'ready';
}

/**
 * Whether a field starts out selected. Only confident matches with a value
 * ready to fill are pre-selected, and existing page values are never
 * overwritten without the user opting in.
 */
export function isAutoSelected(field: FieldSummary, threshold: number): boolean {
  if (!isSelectable(field)) return false;
  if (field.confidence < threshold) return false;
  const pageHasValue = field.currentValue.trim() !== '' && field.kind !== 'checkbox';
  return !pageHasValue;
}

export type FieldGroup = 'ready' | 'review' | 'unknown';

/** Popup grouping: confident & fillable, needs a look, or not recognised. */
export function groupField(field: FieldSummary, threshold: number): FieldGroup {
  if (field.fieldType === FieldType.UNKNOWN) return 'unknown';
  if (isAutoSelected(field, threshold) || field.suggestion.status === 'filled') return 'ready';
  return 'review';
}
