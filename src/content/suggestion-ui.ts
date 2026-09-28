/**
 * Minimal in-page feedback: briefly outlines fields after filling, and
 * scrolls to a field when the user clicks it in the popup. Inline styles are
 * restored afterwards so the page is left untouched.
 */
import { isVisible } from './dom-text';
import type { DetectedField } from './field-detector';

export type HighlightTone = 'success' | 'error' | 'info';

const COLORS: Record<HighlightTone, string> = {
  success: '#16a34a',
  error: '#dc2626',
  info: '#4f46e5',
};

const HIGHLIGHT_MS = 1800;
const active = new WeakMap<HTMLElement, number>();

/** The element to outline: hidden radios/file inputs are shown via their label or container. */
function targetFor(field: DetectedField): HTMLElement {
  const el = field.element;
  if (field.elements.length > 1) {
    const container = field.elements.reduce<HTMLElement | null>((acc, radio) => {
      let node = acc;
      while (node && !node.contains(radio)) node = node.parentElement;
      return node;
    }, el.parentElement);
    if (container && isVisible(container)) return container;
  }
  if (isVisible(el)) return el;
  const label = el.labels?.[0];
  if (label && isVisible(label)) return label;
  return el.parentElement ?? el;
}

export function highlightField(field: DetectedField, tone: HighlightTone): void {
  const target = targetFor(field);
  const previous = active.get(target);
  if (previous !== undefined) {
    window.clearTimeout(previous);
  } else {
    target.dataset.fill2fastOutline = target.style.outline;
    target.dataset.fill2fastOutlineOffset = target.style.outlineOffset;
  }
  target.style.outline = `2px solid ${COLORS[tone]}`;
  target.style.outlineOffset = '2px';
  const timer = window.setTimeout(() => {
    target.style.outline = target.dataset.fill2fastOutline ?? '';
    target.style.outlineOffset = target.dataset.fill2fastOutlineOffset ?? '';
    delete target.dataset.fill2fastOutline;
    delete target.dataset.fill2fastOutlineOffset;
    active.delete(target);
  }, HIGHLIGHT_MS);
  active.set(target, timer);
}

export function revealField(field: DetectedField): void {
  targetFor(field).scrollIntoView({ block: 'center', behavior: 'smooth' });
  highlightField(field, 'info');
}
