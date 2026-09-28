/**
 * Lightweight profile validation. Each validator returns an error message or
 * null. Empty values are always valid (every field is optional).
 */
import type { Profile } from '../types/profile';

export type Validator = (value: string) => string | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const validateEmail: Validator = (value) =>
  !value.trim() || EMAIL.test(value.trim()) ? null : 'Enter a valid email address';

export const validatePhone: Validator = (value) => {
  const v = value.trim();
  if (!v) return null;
  if (!/^\+?[\d\s\-().]+$/.test(v)) return 'Use digits, spaces, +, -, ( )';
  const digits = v.replace(/\D/g, '').length;
  return digits >= 7 && digits <= 15 ? null : 'Enter a phone number with 7–15 digits';
};

/** Add https:// when the user typed a bare domain ("github.com/me"). */
export function normalizeUrl(value: string): string {
  const v = value.trim();
  if (!v) return '';
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
}

export const validateUrl: Validator = (value) => {
  const v = value.trim();
  if (!v) return null;
  try {
    const url = new URL(normalizeUrl(v));
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) throw new Error();
    return null;
  } catch {
    return 'Enter a valid URL';
  }
};

export const validateYears: Validator = (value) => {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 60 ? null : 'Enter a number of years (e.g. 4 or 4.5)';
};

export const validateYear: Validator = (value) => {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v);
  return /^\d{4}$/.test(v) && n >= 1950 && n <= 2100 ? null : 'Enter a 4-digit year';
};

/** Errors keyed by "section.field", e.g. "personal.email". */
export type ValidationErrors = Record<string, string>;

export function validateProfile(profile: Profile): ValidationErrors {
  const checks: Array<[string, string, Validator]> = [
    ['personal.email', profile.personal.email, validateEmail],
    ['personal.phone', profile.personal.phone, validatePhone],
    ['professional.totalExperience', profile.professional.totalExperience, validateYears],
    ['professional.relevantExperience', profile.professional.relevantExperience, validateYears],
    ['links.linkedin', profile.links.linkedin, validateUrl],
    ['links.github', profile.links.github, validateUrl],
    ['links.portfolio', profile.links.portfolio, validateUrl],
    ['links.twitter', profile.links.twitter, validateUrl],
    ['links.leetcode', profile.links.leetcode, validateUrl],
    ['education.graduationYear', profile.education.graduationYear, validateYear],
  ];
  const errors: ValidationErrors = {};
  for (const [key, value, validate] of checks) {
    const error = validate(value);
    if (error) errors[key] = error;
  }
  return errors;
}

/** Normalize values before saving (currently: complete bare URLs). */
export function normalizeProfile(profile: Profile): Profile {
  const links = { ...profile.links };
  for (const key of Object.keys(links) as Array<keyof typeof links>) links[key] = normalizeUrl(links[key]);
  return { ...profile, links };
}
