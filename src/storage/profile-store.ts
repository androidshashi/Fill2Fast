/**
 * Typed access to everything Fill2Fast stores. This is the only module that
 * talks to chrome.storage; everything else goes through these functions.
 *
 * All data stays in chrome.storage.local on this device. Nothing is synced.
 */
import { STORAGE_KEYS } from '../core/constants';
import { applyProfilePatch, createEmptyProfile, mergeSettings, mergeWithDefaults } from '../core/profile-defaults';
import type { DeepPartial, Profile, ResumeMeta, Settings, StoredResume } from '../types/profile';

function area(): chrome.storage.StorageArea {
  return chrome.storage.local;
}

async function read<T = unknown>(key: string): Promise<T | undefined> {
  const result = await area().get(key);
  return result[key] as T | undefined;
}

// ---------------------------------------------------------------- Profile

export async function getProfile(): Promise<Profile> {
  const stored = await read(STORAGE_KEYS.profile);
  return stored ? mergeWithDefaults(stored) : createEmptyProfile();
}

/** Whether the user has saved a profile at least once. */
export async function hasProfile(): Promise<boolean> {
  return (await read(STORAGE_KEYS.profile)) !== undefined;
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  const next = mergeWithDefaults({ ...profile, updatedAt: Date.now() });
  await area().set({ [STORAGE_KEYS.profile]: next });
  return next;
}

/** Merge a partial update into the stored profile, e.g. `updateProfile({ links: { github } })`. */
export async function updateProfile(patch: DeepPartial<Profile>): Promise<Profile> {
  const current = await getProfile();
  return saveProfile(applyProfilePatch(current, patch));
}

/** Delete all personal data: the profile and the stored resume. Settings are kept. */
export async function clearProfile(): Promise<void> {
  await area().remove([STORAGE_KEYS.profile, STORAGE_KEYS.resume, STORAGE_KEYS.resumeMeta]);
}

// ---------------------------------------------------------------- Settings

export async function getSettings(): Promise<Settings> {
  return mergeSettings(await read(STORAGE_KEYS.settings));
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  const next = mergeSettings(settings);
  await area().set({ [STORAGE_KEYS.settings]: next });
  return next;
}

// ---------------------------------------------------------------- Resume

/** Resume metadata only (cheap; does not load the file contents). */
export async function getResumeMeta(): Promise<ResumeMeta | null> {
  return (await read<ResumeMeta>(STORAGE_KEYS.resumeMeta)) ?? null;
}

/** The resume including its base64 contents. */
export async function getResume(): Promise<StoredResume | null> {
  return (await read<StoredResume>(STORAGE_KEYS.resume)) ?? null;
}

export async function saveResume(resume: Omit<StoredResume, 'updatedAt'>): Promise<ResumeMeta> {
  const updatedAt = Date.now();
  const meta: ResumeMeta = { name: resume.name, type: resume.type, size: resume.size, updatedAt };
  await area().set({
    [STORAGE_KEYS.resume]: { ...resume, updatedAt },
    [STORAGE_KEYS.resumeMeta]: meta,
  });
  return meta;
}

export async function clearResume(): Promise<void> {
  await area().remove([STORAGE_KEYS.resume, STORAGE_KEYS.resumeMeta]);
}

// ---------------------------------------------------------------- Changes

/** Call `listener` whenever profile, settings or resume change. Returns an unsubscribe function. */
export function onStoreChanged(listener: () => void): () => void {
  const keys = new Set<string>(Object.values(STORAGE_KEYS));
  const handler = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName === 'local' && Object.keys(changes).some((k) => keys.has(k))) listener();
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
