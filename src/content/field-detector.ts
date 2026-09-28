/**
 * Finds fillable form controls and classifies them.
 *
 * The detector keeps a registry of candidate controls. The content script
 * adds the whole document once, then only the subtrees a MutationObserver
 * reports as added — the full DOM is never rescanned. Classification runs on
 * demand (when the popup asks) over the registered controls.
 */
import { FieldType } from '../core/field-types';
import { isPlaceholderOption } from '../core/option-matcher';
import { normalizeText } from '../core/normalize';
import type { FieldKind } from '../types/messages';
import {
  groupQuestionText,
  isVisible,
  labelText,
  nearbyText,
  optionLabelText,
  type FormControl,
} from './dom-text';
import { classifyField, type FieldSignals } from './field-mapper';

export interface DetectedField {
  /** Stable for the lifetime of the element. */
  id: string;
  kind: FieldKind;
  /** The control (for radio groups: the first radio). */
  element: FormControl;
  /** All controls that make up this field (several for a radio group). */
  elements: FormControl[];
  fieldType: FieldType;
  confidence: number;
  label: string;
  currentValue: string;
}

const CONTROL_SELECTOR = 'input, select, textarea';

const TEXT_INPUT_TYPES = new Set(['text', 'email', 'tel', 'url', 'number', 'search']);

/** Attributes some sites use to label fields for automation/testing. */
const DATA_ATTRIBUTES = ['data-automation-id', 'data-testid', 'data-test', 'data-qa', 'data-field', 'data-name'];

/** The kind of field a control is, or null if Fill2Fast never fills it. */
export function getFieldKind(el: Element): FieldKind | null {
  if (el instanceof HTMLTextAreaElement) return 'textarea';
  if (el instanceof HTMLSelectElement) return el.multiple ? null : 'select';
  if (!(el instanceof HTMLInputElement)) return null;
  // Custom comboboxes (e.g. React Select) are driven by their own widget, not the input value.
  if (el.getAttribute('role') === 'combobox' && el.getAttribute('aria-autocomplete')) return null;
  const type = (el.getAttribute('type') ?? 'text').toLowerCase();
  if (TEXT_INPUT_TYPES.has(type) || !isKnownInputType(type)) return 'text';
  if (type === 'radio') return 'radio';
  if (type === 'checkbox') return 'checkbox';
  if (type === 'file') return 'file';
  // hidden, password, submit, button, reset, image, date/time, color, range…
  return null;
}

const KNOWN_INPUT_TYPES = new Set([
  'hidden', 'password', 'submit', 'button', 'reset', 'image', 'date', 'datetime-local', 'month', 'week', 'time',
  'color', 'range', 'radio', 'checkbox', 'file', ...TEXT_INPUT_TYPES,
]);

function isKnownInputType(type: string): boolean {
  return KNOWN_INPUT_TYPES.has(type);
}

/** Whether the user could currently interact with this control. */
export function isInteractive(el: FormControl, kind: FieldKind): boolean {
  if (el.disabled) return false;
  if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && el.readOnly) return false;
  if (el.getAttribute('aria-hidden') === 'true' && kind !== 'file') return false;
  if (isVisible(el)) return true;
  // Radios, checkboxes and file inputs are often visually hidden behind a styled label or button.
  if (kind === 'radio' || kind === 'checkbox' || kind === 'file') {
    if (el.labels && Array.from(el.labels).some(isVisible)) return true;
    if (kind === 'file' && el.parentElement && isVisible(el.parentElement)) return true;
  }
  return false;
}

function dataAttribute(el: Element): string | undefined {
  for (const attr of DATA_ATTRIBUTES) {
    const value = el.getAttribute(attr);
    if (value) return value;
  }
  return undefined;
}

const YES_NO_LABEL = /^(yes|no|y|n|true|false)$/;

function currentValueOf(el: FormControl, kind: FieldKind): string {
  if (el instanceof HTMLSelectElement) {
    const option = el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null;
    if (!option || isPlaceholderOption({ text: option.text, value: option.value })) return '';
    return option.text.trim();
  }
  if (el instanceof HTMLInputElement) {
    if (kind === 'checkbox') return el.checked ? 'Checked' : '';
    if (kind === 'file') return el.files?.[0]?.name ?? '';
  }
  return el.value;
}

function displayLabel(signals: FieldSignals): string {
  const text = signals.label || signals.ariaLabel || signals.placeholder || signals.nearbyText || signals.name || signals.id;
  return text?.trim() || 'Unlabeled field';
}

export class FieldDetector {
  private readonly controls = new Set<FormControl>();
  private readonly ids = new WeakMap<object, string>();
  private nextId = 1;

  /** @param onShadowRoot called for every open shadow root found, so it can be observed too. */
  constructor(private readonly onShadowRoot?: (root: ShadowRoot) => void) {}

  get size(): number {
    return this.controls.size;
  }

  private idFor(key: object): string {
    let id = this.ids.get(key);
    if (!id) {
      id = `f${this.nextId++}`;
      this.ids.set(key, id);
    }
    return id;
  }

  /** Register candidate controls in `root` and its subtree. Returns how many were new. */
  addFrom(root: Node): number {
    const before = this.controls.size;
    const add = (el: Element) => {
      if (getFieldKind(el)) this.controls.add(el as FormControl);
    };
    if (root instanceof Element && root.matches(CONTROL_SELECTOR)) add(root);
    if (!(root instanceof Element || root instanceof Document || root instanceof DocumentFragment)) return 0;
    root.querySelectorAll(CONTROL_SELECTOR).forEach(add);

    // Open shadow roots (web-component based forms).
    const scope = root instanceof Element && root.shadowRoot ? [root] : [];
    for (const el of [...scope, ...Array.from(root.querySelectorAll('*'))]) {
      if (el.shadowRoot) {
        this.onShadowRoot?.(el.shadowRoot);
        this.addFrom(el.shadowRoot);
      }
    }
    return this.controls.size - before;
  }

  /** Forget controls that are no longer in the document. Returns how many were removed. */
  prune(): number {
    let removed = 0;
    for (const el of this.controls) {
      if (!el.isConnected) {
        this.controls.delete(el);
        removed++;
      }
    }
    return removed;
  }

  /** Classify every currently interactive control. Radio buttons are grouped by name. */
  detect(): DetectedField[] {
    this.prune();
    const fields: DetectedField[] = [];
    const radioGroups = new Map<object, Map<string, HTMLInputElement[]>>();

    for (const el of this.controls) {
      const kind = getFieldKind(el);
      if (!kind || !isInteractive(el, kind)) continue;
      if (kind === 'radio') {
        const radio = el as HTMLInputElement;
        const scope: object = radio.form ?? radio.getRootNode();
        const name = radio.name || `__unnamed_${this.idFor(radio)}`;
        const byName = radioGroups.get(scope) ?? new Map<string, HTMLInputElement[]>();
        radioGroups.set(scope, byName);
        byName.set(name, [...(byName.get(name) ?? []), radio]);
        continue;
      }
      fields.push(this.buildField(el, kind));
    }

    for (const byName of radioGroups.values()) {
      for (const radios of byName.values()) fields.push(this.buildRadioGroup(radios));
    }

    return fields.sort((a, b) =>
      a.element === b.element ? 0 : a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );
  }

  /** Find a field from the latest detection by id. */
  findById(id: string): DetectedField | undefined {
    return this.detect().find((f) => f.id === id);
  }

  private buildField(el: FormControl, kind: FieldKind): DetectedField {
    let label = labelText(el);
    const ariaLabel = el.getAttribute('aria-label')?.trim() || undefined;

    // A checkbox labelled just "Yes" gets its meaning from the question next to it.
    if (kind === 'checkbox' && YES_NO_LABEL.test(normalizeText(label))) {
      label = nearbyText(el.labels?.[0] ?? el) || label;
    }

    const signals: FieldSignals = {
      kind,
      inputType: el instanceof HTMLInputElement ? el.type : undefined,
      autocomplete: el.getAttribute('autocomplete') ?? undefined,
      name: el.getAttribute('name') ?? undefined,
      id: el.id || undefined,
      label: label || undefined,
      ariaLabel,
      placeholder: el.getAttribute('placeholder') ?? undefined,
      dataAttribute: dataAttribute(el),
      nearbyText: label || ariaLabel ? undefined : nearbyText(el) || undefined,
    };
    const { fieldType, confidence } = classifyField(signals);
    return {
      id: this.idFor(el),
      kind,
      element: el,
      elements: [el],
      fieldType,
      confidence,
      label: displayLabel(signals),
      currentValue: currentValueOf(el, kind),
    };
  }

  private buildRadioGroup(radios: HTMLInputElement[]): DetectedField {
    const first = radios[0];
    const question = groupQuestionText(radios);
    const signals: FieldSignals = {
      kind: 'radio',
      name: first.name || undefined,
      label: question || undefined,
      dataAttribute: dataAttribute(first),
    };
    const { fieldType, confidence } = classifyField(signals);
    const checked = radios.find((r) => r.checked);
    return {
      id: this.idFor(first),
      kind: 'radio',
      element: first,
      elements: radios,
      fieldType,
      confidence,
      label: displayLabel(signals),
      currentValue: checked ? optionLabelText(checked) : '',
    };
  }
}
