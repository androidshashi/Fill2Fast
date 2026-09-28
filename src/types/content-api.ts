import type { FieldFillResult, FrameScanResult } from './messages';

/** API the content script exposes to the popup (via chrome.scripting in the isolated world). */
export interface Fill2FastContentApi {
  scan(): Promise<FrameScanResult>;
  fill(ids: string[]): Promise<FieldFillResult[]>;
  reveal(id: string): boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __fill2fast: Fill2FastContentApi | undefined;
}
