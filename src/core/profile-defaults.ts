import { DEFAULT_AUTO_SELECT_THRESHOLD, MAX_AUTO_SELECT_THRESHOLD, MIN_AUTO_SELECT_THRESHOLD } from './constants';
import { PROFILE_VERSION, type Profile, type Settings } from '../types/profile';

export function createEmptyProfile(): Profile {
  return {
    version: PROFILE_VERSION,
    personal: {
      firstName: '',
      lastName: '',
      fullName: '',
      email: '',
      phone: '',
      city: '',
      state: '',
      country: '',
      pincode: '',
    },
    professional: {
      currentCompany: '',
      currentTitle: '',
      totalExperience: '',
      relevantExperience: '',
      noticePeriod: '',
      availability: '',
    },
    skills: { primarySkills: [], secondarySkills: [] },
    links: { linkedin: '', github: '', portfolio: '', twitter: '', leetcode: '' },
    education: { degree: '', university: '', graduationYear: '' },
    preferences: { preferredRole: '', preferredLocation: '', remotePreference: '', employmentType: '' },
    answers: { workAuthorization: '', requiresSponsorship: '', willingToRelocate: '' },
    compensation: { expectedSalary: '', currentSalary: '', allowAutofill: false },
    updatedAt: null,
  };
}

export const DEFAULT_SETTINGS: Settings = {
  autoSelectThreshold: DEFAULT_AUTO_SELECT_THRESHOLD,
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Overlay `stored` onto `defaults`, keeping only values whose type matches the
 * default. Fields added to the schema later get their default value; values
 * of the wrong type (corrupt or from an old version) are dropped.
 */
function mergeInto<T>(defaults: T, stored: unknown): T {
  if (!isPlainObject(defaults) || !isPlainObject(stored)) return defaults;
  const result: Record<string, unknown> = { ...defaults };
  for (const [key, defaultValue] of Object.entries(defaults)) {
    const value = stored[key];
    if (value === undefined) continue;
    if (Array.isArray(defaultValue)) {
      if (Array.isArray(value)) result[key] = value.filter((v): v is string => typeof v === 'string');
    } else if (isPlainObject(defaultValue)) {
      result[key] = mergeInto(defaultValue, value);
    } else if (defaultValue === null) {
      if (value === null || typeof value === 'number') result[key] = value;
    } else if (typeof value === typeof defaultValue) {
      result[key] = value;
    }
  }
  return result as T;
}

export function mergeWithDefaults(stored: unknown): Profile {
  const profile = mergeInto(createEmptyProfile(), stored);
  profile.version = PROFILE_VERSION;
  return profile;
}

export function mergeSettings(stored: unknown): Settings {
  const settings = mergeInto(DEFAULT_SETTINGS, stored);
  const threshold = Number(settings.autoSelectThreshold);
  settings.autoSelectThreshold = Number.isFinite(threshold)
    ? Math.min(MAX_AUTO_SELECT_THRESHOLD, Math.max(MIN_AUTO_SELECT_THRESHOLD, Math.round(threshold)))
    : DEFAULT_AUTO_SELECT_THRESHOLD;
  return settings;
}

/** Deep-merge a partial update into a profile (arrays are replaced, not merged). */
export function applyProfilePatch(profile: Profile, patch: unknown): Profile {
  if (!isPlainObject(patch)) return profile;
  const next: Record<string, unknown> = { ...profile };
  for (const [key, value] of Object.entries(patch)) {
    const current = (profile as unknown as Record<string, unknown>)[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      next[key] = { ...current, ...value };
    } else if (value !== undefined) {
      next[key] = value;
    }
  }
  return mergeWithDefaults(next);
}
