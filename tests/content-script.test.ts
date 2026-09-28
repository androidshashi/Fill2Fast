import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FieldType } from '../src/core/field-types';
import { createEmptyProfile } from '../src/core/profile-defaults';
import { saveProfile } from '../src/storage/profile-store';
import '../src/types/content-api';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('content script', () => {
  beforeEach(async () => {
    const profile = createEmptyProfile();
    profile.personal.email = 'asha@example.com';
    profile.links.github = 'https://github.com/asha';
    await saveProfile(profile);
  });

  it('exposes scan/fill, observes new fields and does not initialise twice', async () => {
    document.body.innerHTML = `<form><label for="e">Email</label><input id="e"></form>`;
    await import('../src/content/content-script');
    const api = globalThis.__fill2fast!;
    expect(api).toBeDefined();

    let scan = await api.scan();
    expect(scan.fields.map((f) => f.fieldType)).toEqual([FieldType.EMAIL]);
    expect(scan.fields[0].suggestion).toMatchObject({ status: 'ready', displayValue: 'asha@example.com' });

    // A field added later (e.g. a multi-step form) is picked up by the MutationObserver.
    const sendMessage = vi.spyOn(chrome.runtime, 'sendMessage');
    const extra = document.createElement('div');
    extra.innerHTML = `<label for="g">GitHub profile</label><input id="g">`;
    document.querySelector('form')!.append(extra);
    await wait(400);
    expect(sendMessage).toHaveBeenCalledWith({ type: 'FIELDS_CHANGED' });

    scan = await api.scan();
    expect(scan.fields.map((f) => f.fieldType)).toEqual([FieldType.EMAIL, FieldType.GITHUB]);

    const results = await api.fill(scan.fields.map((f) => f.id));
    expect(results.map((r) => r.status)).toEqual(['filled', 'filled']);
    expect(document.querySelector<HTMLInputElement>('#g')!.value).toBe('https://github.com/asha');

    // Unknown ids are reported, not thrown.
    expect(await api.fill(['nope'])).toEqual([expect.objectContaining({ id: 'nope', status: 'failed' })]);

    // Re-injecting keeps the same instance.
    vi.resetModules();
    await import('../src/content/content-script');
    expect(globalThis.__fill2fast).toBe(api);
  });
});
