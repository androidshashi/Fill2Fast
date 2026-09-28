/**
 * Reading the text that describes a form control: its <label>, aria
 * attributes and nearby text. Only text adjacent to form fields is read.
 */
import { MAX_SIGNAL_TEXT_LENGTH } from '../core/constants';

export type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const CONTROL_SELECTOR = 'input, select, textarea';
const SKIP_TEXT_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SELECT', 'OPTION', 'TEXTAREA', 'INPUT', 'BUTTON', 'SVG']);

/** How many levels up to look for nearby text. */
const MAX_NEARBY_DEPTH = 6;

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_SIGNAL_TEXT_LENGTH);
}

/** Visible-ish text of a node, excluding text inside nested form controls. */
export function textOf(node: Node | null | undefined): string {
  if (!node) return '';
  if (node.nodeType === Node.TEXT_NODE) return clean(node.textContent ?? '');
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const parts: string[] = [];
  let length = 0;
  const walk = (n: Node) => {
    if (length > MAX_SIGNAL_TEXT_LENGTH) return;
    if (n.nodeType === Node.TEXT_NODE) {
      const t = n.textContent ?? '';
      parts.push(t);
      length += t.length;
      return;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const el = n as Element;
    if (SKIP_TEXT_TAGS.has(el.tagName.toUpperCase()) || el.getAttribute('aria-hidden') === 'true') return;
    for (const child of Array.from(el.childNodes)) walk(child);
  };
  walk(node);
  return clean(parts.join(' '));
}

function byIdInRoot(el: Element, id: string): Element | null {
  const root = el.getRootNode() as Document | ShadowRoot;
  return typeof root.getElementById === 'function' ? root.getElementById(id) : document.getElementById(id);
}

/** Text of elements referenced by aria-labelledby. */
export function ariaLabelledByText(el: Element): string {
  const ids = el.getAttribute('aria-labelledby');
  if (!ids) return '';
  return clean(
    ids
      .split(/\s+/)
      .map((id) => textOf(byIdInRoot(el, id)))
      .filter(Boolean)
      .join(' '),
  );
}

/** Text of associated <label> elements (label[for] or a wrapping label), then aria-labelledby. */
export function labelText(el: FormControl): string {
  const labels = el.labels ? Array.from(el.labels) : [];
  const text = [...new Set(labels.map((l) => textOf(l)).filter(Boolean))].join(' ');
  return clean(text) || ariaLabelledByText(el);
}

function controlCount(el: Element): number {
  return (el.matches(CONTROL_SELECTOR) ? 1 : 0) + el.querySelectorAll(CONTROL_SELECTOR).length;
}

/**
 * Text immediately before the control (or its group): preceding siblings,
 * then preceding siblings of ancestors, stopping as soon as the search would
 * reach text that belongs to a different control.
 *
 * @param groupSize number of controls that belong to this field (radio groups).
 */
export function nearbyText(start: Element, groupSize = 1): string {
  let node: Element | null = start;
  for (let depth = 0; node && depth < MAX_NEARBY_DEPTH; depth++) {
    for (let sib = node.previousSibling; sib; sib = sib.previousSibling) {
      if (sib.nodeType === Node.ELEMENT_NODE && controlCount(sib as Element) > 0) return '';
      const text = textOf(sib);
      if (text) return text;
    }
    const parent: HTMLElement | null = node.parentElement;
    if (!parent || parent === document.body || controlCount(parent) > groupSize) break;
    if (parent.tagName === 'FIELDSET') {
      const legend = parent.querySelector(':scope > legend');
      if (legend) return textOf(legend);
    }
    node = parent;
  }
  return '';
}

/** The question for a group of radios: fieldset legend, radiogroup label, or text before the group. */
export function groupQuestionText(radios: HTMLInputElement[]): string {
  const first = radios[0];
  const fieldset = first.closest('fieldset');
  if (fieldset && radios.every((r) => fieldset.contains(r))) {
    const legend = fieldset.querySelector(':scope > legend');
    const text = textOf(legend);
    if (text) return text;
  }
  const group = first.closest('[role="radiogroup"], [role="group"]');
  if (group && radios.every((r) => group.contains(r))) {
    const text = group.getAttribute('aria-label')?.trim() || ariaLabelledByText(group);
    if (text) return clean(text);
  }
  return nearbyText(first, radios.length);
}

/** The visible text of one radio/checkbox option ("Yes", "No"). */
export function optionLabelText(input: HTMLInputElement): string {
  const label = labelText(input);
  if (label) return label;
  const next = input.nextSibling;
  const text = textOf(next);
  if (text) return text;
  return clean(input.getAttribute('aria-label') ?? '') || input.value;
}

/** Whether the element is rendered and visible to the user. */
export function isVisible(el: Element): boolean {
  const check = (el as Element & { checkVisibility?: (opts?: object) => boolean }).checkVisibility;
  if (typeof check === 'function') {
    if (!check.call(el, { checkVisibilityCSS: true })) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) return false;
    // Anti-bot honeypots are often pushed off-screen (left: -9999px).
    return rect.right + window.scrollX > 0 && rect.bottom + window.scrollY > 0;
  }
  // Fallback for environments without layout (unit tests): inspect computed styles.
  for (let node: Element | null = el; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.display === 'none') return false;
    if (node === el && style.visibility === 'hidden') return false;
    if ((node as HTMLElement).hidden) return false;
  }
  return true;
}
