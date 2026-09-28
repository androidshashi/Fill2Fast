/**
 * Popup ↔ page communication. The content script is injected only when the
 * popup opens (activeTab), then called per frame through chrome.scripting.
 */
import type { FieldFillResult, FrameScanResult } from '../types/messages';
import '../types/content-api';

export interface FrameScan {
  frameId: number;
  result: FrameScanResult;
}

/** Thrown for pages extensions may not script (chrome://, the Web Store, PDFs…). */
export class PageUnavailableError extends Error {}

export async function getActiveTabId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) throw new PageUnavailableError('No active tab');
  return tab.id;
}

async function inject(tabId: number): Promise<void> {
  try {
    // Frames we have no permission for are skipped by Chrome.
    await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ['content.js'] });
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    } catch (error) {
      throw new PageUnavailableError(error instanceof Error ? error.message : String(error));
    }
  }
}

export async function scanPage(tabId: number): Promise<FrameScan[]> {
  await inject(tabId);
  let results: chrome.scripting.InjectionResult<FrameScanResult | null>[];
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => globalThis.__fill2fast?.scan() ?? null,
    });
  } catch {
    results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => globalThis.__fill2fast?.scan() ?? null,
    });
  }
  const scans: FrameScan[] = [];
  for (const { frameId, result } of results) if (result) scans.push({ frameId, result });
  return scans.sort((a, b) => a.frameId - b.frameId);
}

export async function fillFields(tabId: number, frameId: number, ids: string[]): Promise<FieldFillResult[]> {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    func: (fieldIds: string[]) => globalThis.__fill2fast?.fill(fieldIds) ?? null,
    args: [ids],
  });
  return injection?.result ?? ids.map((id) => ({ id, status: 'failed', message: 'Could not fill this field: page changed' }));
}

export async function revealField(tabId: number, frameId: number, id: string): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    func: (fieldId: string) => globalThis.__fill2fast?.reveal(fieldId) ?? false,
    args: [id],
  });
}

/** Host patterns for the given origins, e.g. "https://boards.greenhouse.io/*". */
function originPatterns(origins: string[]): string[] {
  return origins.map((origin) => `${origin}/*`);
}

export async function hasOriginAccess(origins: string[]): Promise<boolean> {
  if (origins.length === 0) return true;
  return chrome.permissions.contains({ origins: originPatterns(origins) });
}

/** Ask for access to embedded form origins. Must be called from a user gesture. */
export async function requestOriginAccess(origins: string[]): Promise<boolean> {
  return chrome.permissions.request({ origins: originPatterns(origins) });
}
