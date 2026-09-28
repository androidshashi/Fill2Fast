import { describe, expect, it, vi } from 'vitest';
import { createEmptyProfile } from '../src/core/profile-defaults';
import {
  clearProfile,
  clearResume,
  getProfile,
  getResume,
  getResumeMeta,
  getSettings,
  hasProfile,
  onStoreChanged,
  saveProfile,
  saveResume,
  saveSettings,
  updateProfile,
} from '../src/storage/profile-store';

describe('profile store', () => {
  it('returns an empty profile when nothing is stored', async () => {
    expect(await hasProfile()).toBe(false);
    expect(await getProfile()).toEqual(createEmptyProfile());
  });

  it('saves and loads', async () => {
    const profile = createEmptyProfile();
    profile.personal.email = 'dev@example.com';
    profile.skills.primarySkills = ['Kotlin', 'Flutter'];
    const saved = await saveProfile(profile);

    expect(saved.updatedAt).toBeTypeOf('number');
    expect(await hasProfile()).toBe(true);
    const loaded = await getProfile();
    expect(loaded.personal.email).toBe('dev@example.com');
    expect(loaded.skills.primarySkills).toEqual(['Kotlin', 'Flutter']);
  });

  it('updates part of the profile without touching the rest', async () => {
    const profile = createEmptyProfile();
    profile.personal.firstName = 'Asha';
    await saveProfile(profile);

    await updateProfile({ links: { github: 'https://github.com/asha' } });
    const loaded = await getProfile();
    expect(loaded.personal.firstName).toBe('Asha');
    expect(loaded.links.github).toBe('https://github.com/asha');
  });

  it('clears the profile and resume but keeps settings', async () => {
    await saveProfile(createEmptyProfile());
    await saveResume({ name: 'cv.pdf', type: 'application/pdf', size: 3, data: 'YWJj' });
    await saveSettings({ autoSelectThreshold: 85 });

    await clearProfile();
    expect(await hasProfile()).toBe(false);
    expect(await getResumeMeta()).toBeNull();
    expect((await getSettings()).autoSelectThreshold).toBe(85);
  });

  it('stores the resume separately from its metadata', async () => {
    const meta = await saveResume({ name: 'cv.pdf', type: 'application/pdf', size: 3, data: 'YWJj' });
    expect(meta).toMatchObject({ name: 'cv.pdf', size: 3 });
    expect(await getResumeMeta()).toEqual(meta);
    expect((await getResume())?.data).toBe('YWJj');
    await clearResume();
    expect(await getResume()).toBeNull();
  });

  it('notifies listeners on change', async () => {
    const listener = vi.fn();
    const unsubscribe = onStoreChanged(listener);
    await saveProfile(createEmptyProfile());
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    await saveProfile(createEmptyProfile());
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
