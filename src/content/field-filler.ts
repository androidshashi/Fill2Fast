/**
 * Planning and performing fills.
 *
 * `planFill` decides what would be written into a field (used both for the
 * popup preview and for the actual fill), `performFill` writes it in a way
 * that framework-managed inputs (React, Angular, Vue) notice.
 */
import { base64ToBytes } from '../core/base64';
import { NUMERIC_FIELD_TYPES } from '../core/field-types';
import { matchBooleanOption, matchOption, type OptionLike, type OptionMatch } from '../core/option-matcher';
import { resolveProfileValue } from '../core/profile-values';
import type { FieldFillResult, Suggestion } from '../types/messages';
import type { Profile, ResumeMeta, StoredResume } from '../types/profile';
import { optionLabelText } from './dom-text';
import type { DetectedField } from './field-detector';

export type FillAction =
  | { type: 'text'; value: string }
  | { type: 'select'; index: number }
  | { type: 'radio'; element: HTMLInputElement }
  | { type: 'checkbox'; checked: boolean }
  | { type: 'file' };

export interface FillPlan {
  suggestion: Suggestion;
  /** Present only when the suggestion is 'ready'. */
  action?: FillAction;
}

const unknown: FillPlan = { suggestion: { status: 'unknown', message: 'Unknown field' } };

function planChoice(
  options: OptionLike[],
  match: OptionMatch,
  wanted: string,
  isCurrent: (index: number) => boolean,
  toAction: (index: number) => FillAction,
): FillPlan {
  if (match.status === 'none') {
    return { suggestion: { status: 'no-option', message: `No option matches “${wanted}”` } };
  }
  if (match.status === 'ambiguous') {
    return { suggestion: { status: 'ambiguous', message: 'Several options match — choose manually' } };
  }
  const displayValue = options[match.index].text.trim() || options[match.index].value;
  if (isCurrent(match.index)) return { suggestion: { status: 'filled', displayValue } };
  return { suggestion: { status: 'ready', displayValue }, action: toAction(match.index) };
}

export function planFill(field: DetectedField, profile: Profile, resume: ResumeMeta | null): FillPlan {
  const resolution = resolveProfileValue(profile, field.fieldType, resume);
  if (!resolution.ok) return { suggestion: { status: resolution.status, message: resolution.message } };
  const value = resolution.value;
  const el = field.element;

  if (value.kind === 'file') {
    if (field.kind !== 'file') return unknown;
    const current = (el as HTMLInputElement).files?.[0]?.name;
    if (current === value.name) return { suggestion: { status: 'filled', displayValue: value.name } };
    return { suggestion: { status: 'ready', displayValue: value.name }, action: { type: 'file' } };
  }

  switch (field.kind) {
    case 'text':
    case 'textarea': {
      if (value.kind !== 'text') return unknown;
      if ((el as HTMLInputElement).value.trim() === value.value) {
        return { suggestion: { status: 'filled', displayValue: value.value } };
      }
      return { suggestion: { status: 'ready', displayValue: value.value }, action: { type: 'text', value: value.value } };
    }

    case 'select': {
      const select = el as HTMLSelectElement;
      const options = Array.from(select.options).map((o) => ({ text: o.text, value: o.value }));
      const wanted = value.kind === 'boolean' ? (value.value ? 'Yes' : 'No') : value.value;
      const match =
        value.kind === 'boolean'
          ? matchBooleanOption(options, value.value)
          : matchOption(options, value.value, { numeric: NUMERIC_FIELD_TYPES.has(field.fieldType) });
      return planChoice(options, match, wanted, (i) => select.selectedIndex === i, (index) => ({ type: 'select', index }));
    }

    case 'radio': {
      const radios = field.elements as HTMLInputElement[];
      const options = radios.map((r) => ({ text: optionLabelText(r), value: r.value }));
      const wanted = value.kind === 'boolean' ? (value.value ? 'Yes' : 'No') : value.value;
      const match =
        value.kind === 'boolean'
          ? matchBooleanOption(options, value.value)
          : matchOption(options, value.value, { numeric: NUMERIC_FIELD_TYPES.has(field.fieldType) });
      return planChoice(options, match, wanted, (i) => radios[i].checked, (i) => ({ type: 'radio', element: radios[i] }));
    }

    case 'checkbox': {
      if (value.kind !== 'boolean') return unknown;
      const checkbox = el as HTMLInputElement;
      const displayValue = value.value ? 'Checked' : 'Unchecked';
      if (checkbox.checked === value.value) return { suggestion: { status: 'filled', displayValue } };
      return { suggestion: { status: 'ready', displayValue }, action: { type: 'checkbox', checked: value.value } };
    }

    default:
      return unknown;
  }
}

// ------------------------------------------------------------------ DOM writes

/**
 * Set `value` through the native prototype setter. Frameworks such as React
 * install their own `value` setter on the element to track changes; going
 * through the prototype setter makes the subsequent `input` event register as
 * a real change instead of being swallowed.
 */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
}

function setNativeChecked(el: HTMLInputElement, checked: boolean): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set;
  if (setter) setter.call(el, checked);
  else el.checked = checked;
}

function dispatch(el: Element, type: string): void {
  const event =
    type === 'input'
      ? new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertReplacementText' })
      : new Event(type, { bubbles: true, composed: true });
  el.dispatchEvent(event);
}

/** Focus → set → input → change → blur, the sequence a user edit produces. */
function withFocus(el: HTMLElement, write: () => void): void {
  el.focus({ preventScroll: true });
  const focused = el.ownerDocument.activeElement === el;
  if (!focused) el.dispatchEvent(new FocusEvent('focus'));
  write();
  dispatch(el, 'input');
  dispatch(el, 'change');
  if (focused) {
    el.blur();
  } else {
    el.dispatchEvent(new FocusEvent('blur'));
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }));
  }
}

function fillText(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const before = el.value;
  withFocus(el, () => setNativeValue(el, value));
  if (el.value === value) return;
  // Some inputs reformat values (phone masks). Accept it if the page kept a new value.
  if (el.value.trim() !== '' && el.value !== before) return;
  throw new Error('The page rejected the value');
}

function fillSelect(el: HTMLSelectElement, index: number): void {
  const option = el.options[index];
  if (!option) throw new Error('Option no longer exists');
  withFocus(el, () => {
    setNativeValue(el, option.value);
    // Options that share a value: select by index to be exact.
    if (el.selectedIndex !== index) el.selectedIndex = index;
  });
  if (el.selectedIndex !== index) throw new Error('The page rejected the selection');
}

/** Toggle via click() so frameworks see a genuine click → change sequence. */
function setChecked(el: HTMLInputElement, checked: boolean): void {
  if (el.checked !== checked) el.click();
  if (el.checked !== checked) {
    setNativeChecked(el, checked);
    dispatch(el, 'input');
    dispatch(el, 'change');
  }
  if (el.checked !== checked) throw new Error('The page rejected the change');
}

function attachFile(el: HTMLInputElement, resume: StoredResume): void {
  const file = new File([base64ToBytes(resume.data)], resume.name, {
    type: resume.type || 'application/octet-stream',
    lastModified: resume.updatedAt,
  });
  const transfer = new DataTransfer();
  transfer.items.add(file);
  el.files = transfer.files;
  dispatch(el, 'input');
  dispatch(el, 'change');
  if (el.files?.[0]?.name !== resume.name) throw new Error('This upload field does not accept attached files');
}

export interface FillContext {
  /** Loads the stored resume on demand (it can be a few MB). */
  loadResume: () => Promise<StoredResume | null>;
}

/** Fill one field. Never throws: failures are reported in the result. */
export async function performFill(field: DetectedField, plan: FillPlan, context: FillContext): Promise<FieldFillResult> {
  const { action } = plan;
  if (!action) {
    return { id: field.id, status: 'skipped', message: plan.suggestion.message ?? 'Nothing to fill' };
  }
  try {
    switch (action.type) {
      case 'text':
        fillText(field.element as HTMLInputElement | HTMLTextAreaElement, action.value);
        break;
      case 'select':
        fillSelect(field.element as HTMLSelectElement, action.index);
        break;
      case 'radio':
        setChecked(action.element, true);
        break;
      case 'checkbox':
        setChecked(field.element as HTMLInputElement, action.checked);
        break;
      case 'file': {
        const resume = await context.loadResume();
        if (!resume) return { id: field.id, status: 'skipped', message: 'No resume saved' };
        attachFile(field.element as HTMLInputElement, resume);
        break;
      }
    }
    return { id: field.id, status: 'filled' };
  } catch (error) {
    const reason = error instanceof Error && error.message ? error.message : 'Unknown error';
    return { id: field.id, status: 'failed', message: `Could not fill this field: ${reason}` };
  }
}
