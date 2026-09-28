/**
 * Content script entry point.
 *
 * Injected on demand by the popup (never automatically), into the page and
 * any iframes Fill2Fast has access to. It exposes a small API on the isolated
 * world's global object that the popup invokes via chrome.scripting:
 *
 *   scan()        → detected fields with suggestions
 *   fill(ids)     → fill the chosen fields
 *   reveal(id)    → scroll to and highlight a field
 *
 * It reads the profile from local extension storage and never sends page
 * content or profile data anywhere.
 */
import { MUTATION_DEBOUNCE_MS } from '../core/constants';
import { getProfile, getResume, getResumeMeta } from '../storage/profile-store';
import type { Fill2FastContentApi } from '../types/content-api';
import type { FieldFillResult, FieldSummary, RuntimeMessage } from '../types/messages';
import { FieldDetector } from './field-detector';
import { performFill, planFill } from './field-filler';
import { highlightField, revealField } from './suggestion-ui';

function createObserver(detector: FieldDetector): { observe: (root: Node) => void } {
  const pending = new Set<Node>();
  let needsPrune = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    timer = undefined;
    let changed = 0;
    for (const node of pending) {
      if (node.isConnected) changed += detector.addFrom(node);
    }
    pending.clear();
    if (needsPrune) {
      changed += detector.prune();
      needsPrune = false;
    }
    if (changed > 0) notifyFieldsChanged();
  };

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) pending.add(node);
      });
      if (record.removedNodes.length > 0) needsPrune = true;
    }
    if ((pending.size > 0 || needsPrune) && timer === undefined) {
      timer = setTimeout(flush, MUTATION_DEBOUNCE_MS);
    }
  });

  return {
    observe: (root: Node) => observer.observe(root, { childList: true, subtree: true }),
  };
}

/** Tell an open popup that fields appeared or disappeared. */
function notifyFieldsChanged(): void {
  const message: RuntimeMessage = { type: 'FIELDS_CHANGED' };
  chrome.runtime.sendMessage(message).catch(() => {
    // No popup open; nothing to do.
  });
}

/** Origins of visible cross-origin iframes (for example an embedded Greenhouse form). */
function embeddedFormOrigins(): string[] {
  if (window !== window.top) return [];
  const origins = new Set<string>();
  for (const frame of Array.from(document.querySelectorAll('iframe'))) {
    try {
      const url = new URL(frame.src, location.href);
      if (!/^https?:$/.test(url.protocol) || url.origin === location.origin) continue;
      const rect = frame.getBoundingClientRect();
      if (rect.width < 200 || rect.height < 150) continue;
      origins.add(url.origin);
    } catch {
      // Invalid src; ignore.
    }
  }
  return [...origins];
}

function start(): Fill2FastContentApi {
  let observer: { observe: (root: Node) => void } | null = null;
  const detector = new FieldDetector((shadowRoot) => observer?.observe(shadowRoot));
  observer = createObserver(detector);
  detector.addFrom(document);
  observer.observe(document);

  return {
    async scan() {
      const [profile, resume] = await Promise.all([getProfile(), getResumeMeta()]);
      const fields: FieldSummary[] = detector.detect().map((field) => ({
        id: field.id,
        kind: field.kind,
        fieldType: field.fieldType,
        confidence: field.confidence,
        label: field.label,
        currentValue: field.currentValue,
        suggestion: planFill(field, profile, resume).suggestion,
      }));
      return { fields, embeddedOrigins: embeddedFormOrigins(), url: location.href };
    },

    async fill(ids) {
      // Always read the latest profile so edits apply immediately.
      const [profile, resumeMeta] = await Promise.all([getProfile(), getResumeMeta()]);
      const fields = new Map(detector.detect().map((f) => [f.id, f]));
      const results: FieldFillResult[] = [];
      for (const id of ids) {
        const field = fields.get(id);
        if (!field) {
          results.push({ id, status: 'failed', message: 'Could not fill this field: it is no longer on the page' });
          continue;
        }
        const plan = planFill(field, profile, resumeMeta);
        const result = await performFill(field, plan, { loadResume: getResume });
        if (result.status !== 'skipped') highlightField(field, result.status === 'filled' ? 'success' : 'error');
        results.push(result);
      }
      return results;
    },

    reveal(id) {
      const field = detector.findById(id);
      if (!field) return false;
      revealField(field);
      return true;
    },
  };
}

// Injecting twice (popup reopened) must not create a second observer.
if (!globalThis.__fill2fast) {
  globalThis.__fill2fast = start();
}
