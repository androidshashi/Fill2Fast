import { useCallback, useEffect, useRef, useState } from 'react';
import { isAutoSelected } from '../core/selection';
import type { FieldFillResult, FieldSummary, RuntimeMessage } from '../types/messages';
import {
  fillFields,
  getActiveTabId,
  hasOriginAccess,
  PageUnavailableError,
  revealField,
  scanPage,
} from './page-bridge';

/** A field in the popup, identified across frames. */
export interface PopupField extends FieldSummary {
  key: string;
  frameId: number;
}

export type PageState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string }
  | { status: 'ready' };

const RESCAN_DEBOUNCE_MS = 300;

export function usePageFields(threshold: number | null) {
  const [state, setState] = useState<PageState>({ status: 'loading' });
  const [fields, setFields] = useState<PopupField[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, FieldFillResult>>({});
  const [blockedOrigins, setBlockedOrigins] = useState<string[]>([]);
  const [filling, setFilling] = useState(false);
  const tabId = useRef<number | null>(null);

  const scan = useCallback(async () => {
    if (threshold === null) return;
    try {
      tabId.current ??= await getActiveTabId();
      const frames = await scanPage(tabId.current);
      const next = frames.flatMap(({ frameId, result }) =>
        result.fields.map((field) => ({ ...field, frameId, key: `${frameId}:${field.id}` })),
      );
      setFields(next);
      // Keep the user's choices; pre-select only fields we haven't seen yet.
      setSelected((prev) => {
        const merged: Record<string, boolean> = {};
        for (const field of next) merged[field.key] = prev[field.key] ?? isAutoSelected(field, threshold);
        return merged;
      });

      const origins = [...new Set(frames.flatMap((f) => f.result.embeddedOrigins))];
      const reachable = new Set(frames.map((f) => new URL(f.result.url).origin));
      const missing = origins.filter((o) => !reachable.has(o));
      setBlockedOrigins(missing.length > 0 && !(await hasOriginAccess(missing)) ? missing : []);
      setState({ status: 'ready' });
    } catch (error) {
      if (error instanceof PageUnavailableError) setState({ status: 'unavailable' });
      else setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  }, [threshold]);

  useEffect(() => {
    void scan();
  }, [scan]);

  // Re-scan when the page adds or removes fields while the popup is open.
  useEffect(() => {
    let timer: number | undefined;
    const listener = (message: RuntimeMessage, sender: chrome.runtime.MessageSender) => {
      if (message?.type !== 'FIELDS_CHANGED' || sender.tab?.id !== tabId.current) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void scan(), RESCAN_DEBOUNCE_MS);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => {
      window.clearTimeout(timer);
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [scan]);

  const toggle = useCallback((key: string) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const fillSelected = useCallback(async () => {
    if (tabId.current === null) return;
    const chosen = fields.filter((f) => selected[f.key] && f.suggestion.status === 'ready');
    const byFrame = new Map<number, PopupField[]>();
    for (const field of chosen) byFrame.set(field.frameId, [...(byFrame.get(field.frameId) ?? []), field]);

    setFilling(true);
    const collected: Record<string, FieldFillResult> = {};
    for (const [frameId, frameFields] of byFrame) {
      try {
        const frameResults = await fillFields(tabId.current, frameId, frameFields.map((f) => f.id));
        for (const r of frameResults) collected[`${frameId}:${r.id}`] = r;
      } catch {
        // The frame navigated or was removed; report its fields as failed and continue.
        for (const f of frameFields) collected[f.key] = { id: f.id, status: 'failed', message: 'Could not fill this field' };
      }
    }
    setResults(collected);
    setSelected((prev) => {
      const next = { ...prev };
      for (const [key, result] of Object.entries(collected)) if (result.status === 'filled') next[key] = false;
      return next;
    });
    setFilling(false);
    await scan();
  }, [fields, selected, scan]);

  const reveal = useCallback(async (field: PopupField) => {
    if (tabId.current === null) return;
    try {
      await revealField(tabId.current, field.frameId, field.id);
    } catch {
      // Field is gone; the next scan will drop it.
    }
  }, []);

  return { state, fields, selected, results, blockedOrigins, filling, toggle, fillSelected, reveal, rescan: scan };
}
