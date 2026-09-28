import { describe, expect, it } from 'vitest';
import { computeCompletion } from '../src/core/completion';
import { combineScores, confidenceLevel, scoreSignal } from '../src/core/confidence';
import { FieldType } from '../src/core/field-types';
import { compileKeyword, matchesKeyword, normalizeText, tokenize } from '../src/core/normalize';
import { applyProfilePatch, createEmptyProfile, mergeSettings, mergeWithDefaults } from '../src/core/profile-defaults';
import { resolveProfileValue } from '../src/core/profile-values';
import { isAutoSelected } from '../src/core/selection';
import { normalizeProfile, validateEmail, validatePhone, validateProfile, validateUrl, validateYears } from '../src/core/validation';
import type { FieldSummary } from '../src/types/messages';

describe('normalization', () => {
  it.each(['India', 'india', 'INDIA', '  India  ', 'Índia'])('"%s" normalizes to "india"', (value) => {
    expect(normalizeText(value)).toBe('india');
  });

  it('tokenizes camelCase, snake_case and brackets', () => {
    expect(tokenize('job_application[firstName]')).toEqual(['job', 'application', 'first', 'name']);
    expect(tokenize('LinkedIn URL')).toEqual(['linked', 'in', 'url']);
    expect(tokenize('Please enter your email')).toEqual(['email']);
  });

  it('matches keywords on word boundaries regardless of spacing', () => {
    const kw = compileKeyword('first name');
    expect(matchesKeyword(tokenize('firstname'), kw)).toBe(true);
    expect(matchesKeyword(tokenize('first_name'), kw)).toBe(true);
    expect(matchesKeyword(tokenize('firstNameField'), kw)).toBe(true);
    expect(matchesKeyword(tokenize('state'), compileKeyword('state'))).toBe(true);
    expect(matchesKeyword(tokenize('statement'), compileKeyword('state'))).toBe(false);
  });

  it('exact keywords only match the whole signal', () => {
    expect(matchesKeyword(tokenize('Name'), compileKeyword('=name'))).toBe(true);
    expect(matchesKeyword(tokenize('Company name'), compileKeyword('=name'))).toBe(false);
  });
});

describe('confidence scoring', () => {
  it('uses the signal weight for full coverage', () => {
    expect(scoreSignal('autocomplete')).toBe(98);
    expect(scoreSignal('name')).toBe(90);
    expect(scoreSignal('label')).toBe(85);
    expect(scoreSignal('placeholder')).toBe(80);
  });

  it('penalizes partial coverage, less so for questions', () => {
    expect(scoreSignal('label', 0.3)).toBeLessThan(scoreSignal('label', 1));
    expect(scoreSignal('label', 0.3, true)).toBeGreaterThan(scoreSignal('label', 0.3));
  });

  it('combines signals with a capped bonus', () => {
    expect(combineScores([85])).toBe(85);
    expect(combineScores([85, 80])).toBe(88);
    expect(combineScores([98, 90, 88, 85, 80])).toBe(99);
    expect(combineScores([])).toBe(0);
  });

  it('buckets confidence', () => {
    expect(confidenceLevel(95)).toBe('very-high');
    expect(confidenceLevel(80)).toBe('high');
    expect(confidenceLevel(65)).toBe('possible');
    expect(confidenceLevel(40)).toBe('unknown');
  });
});

describe('profile defaults', () => {
  it('fills in fields missing from an older stored profile', () => {
    const merged = mergeWithDefaults({ personal: { firstName: 'Asha' }, links: { github: 'https://github.com/asha' } });
    expect(merged.personal.firstName).toBe('Asha');
    expect(merged.personal.email).toBe('');
    expect(merged.skills.primarySkills).toEqual([]);
    expect(merged.links.github).toBe('https://github.com/asha');
  });

  it('drops values of the wrong type', () => {
    const merged = mergeWithDefaults({ personal: { email: 42 }, skills: { primarySkills: ['Kotlin', 7] } });
    expect(merged.personal.email).toBe('');
    expect(merged.skills.primarySkills).toEqual(['Kotlin']);
  });

  it('applies partial patches section by section', () => {
    const base = createEmptyProfile();
    base.personal.firstName = 'Asha';
    const next = applyProfilePatch(base, { personal: { lastName: 'Rao' } });
    expect(next.personal).toMatchObject({ firstName: 'Asha', lastName: 'Rao' });
  });

  it('clamps settings', () => {
    expect(mergeSettings({ autoSelectThreshold: 10 }).autoSelectThreshold).toBe(60);
    expect(mergeSettings({ autoSelectThreshold: 'x' }).autoSelectThreshold).toBe(75);
  });
});

describe('profile values', () => {
  const profile = createEmptyProfile();
  profile.personal.firstName = 'Asha';
  profile.personal.lastName = 'Rao';
  profile.skills.primarySkills = ['Flutter', 'Dart'];
  profile.skills.secondarySkills = ['Git'];
  profile.answers.workAuthorization = 'yes';
  profile.compensation.expectedSalary = '30 LPA';

  it('derives full name and skills', () => {
    expect(resolveProfileValue(profile, FieldType.FULL_NAME, null)).toEqual({ ok: true, value: { kind: 'text', value: 'Asha Rao' } });
    expect(resolveProfileValue(profile, FieldType.SKILLS, null)).toEqual({ ok: true, value: { kind: 'text', value: 'Flutter, Dart, Git' } });
  });

  it('reports missing values instead of empty strings', () => {
    expect(resolveProfileValue(profile, FieldType.EMAIL, null)).toMatchObject({ ok: false, status: 'missing' });
  });

  it('blocks salary unless explicitly allowed', () => {
    expect(resolveProfileValue(profile, FieldType.EXPECTED_SALARY, null)).toMatchObject({ ok: false, status: 'blocked' });
    const allowed = { ...profile, compensation: { ...profile.compensation, allowAutofill: true } };
    expect(resolveProfileValue(allowed, FieldType.EXPECTED_SALARY, null)).toMatchObject({ ok: true });
  });

  it('never fills unknown fields', () => {
    expect(resolveProfileValue(profile, FieldType.UNKNOWN, null)).toMatchObject({ ok: false, status: 'unknown' });
  });

  it('maps yes/no answers to booleans', () => {
    expect(resolveProfileValue(profile, FieldType.WORK_AUTHORIZATION, null)).toEqual({ ok: true, value: { kind: 'boolean', value: true } });
    expect(resolveProfileValue(profile, FieldType.SPONSORSHIP, null)).toMatchObject({ ok: false, status: 'missing' });
  });
});

describe('selection', () => {
  const field = (overrides: Partial<FieldSummary>): FieldSummary => ({
    id: 'f1',
    kind: 'text',
    fieldType: FieldType.EMAIL,
    confidence: 90,
    label: 'Email',
    currentValue: '',
    suggestion: { status: 'ready', displayValue: 'a@b.co' },
    ...overrides,
  });

  it('pre-selects confident, ready, empty fields', () => {
    expect(isAutoSelected(field({}), 75)).toBe(true);
  });
  it('does not pre-select below the threshold', () => {
    expect(isAutoSelected(field({ confidence: 70 }), 75)).toBe(false);
  });
  it('does not pre-select fields that already have a value', () => {
    expect(isAutoSelected(field({ currentValue: 'other@x.co' }), 75)).toBe(false);
  });
  it('never pre-selects unknown, missing or blocked fields', () => {
    expect(isAutoSelected(field({ fieldType: FieldType.UNKNOWN }), 75)).toBe(false);
    expect(isAutoSelected(field({ suggestion: { status: 'missing' } }), 75)).toBe(false);
    expect(isAutoSelected(field({ suggestion: { status: 'blocked' } }), 75)).toBe(false);
  });
});

describe('validation', () => {
  it('emails', () => {
    expect(validateEmail('dev@example.com')).toBeNull();
    expect(validateEmail('dev@example')).not.toBeNull();
    expect(validateEmail('')).toBeNull();
  });
  it('phones', () => {
    expect(validatePhone('+91 98765 43210')).toBeNull();
    expect(validatePhone('(555) 123-4567')).toBeNull();
    expect(validatePhone('12ab')).not.toBeNull();
    expect(validatePhone('123')).not.toBeNull();
  });
  it('urls, with or without scheme', () => {
    expect(validateUrl('github.com/dev')).toBeNull();
    expect(validateUrl('https://linkedin.com/in/dev')).toBeNull();
    expect(validateUrl('not a url')).not.toBeNull();
  });
  it('experience', () => {
    expect(validateYears('4.5')).toBeNull();
    expect(validateYears('five')).not.toBeNull();
  });
  it('validates a whole profile and normalizes URLs', () => {
    const profile = createEmptyProfile();
    profile.personal.email = 'bad';
    profile.links.github = 'github.com/dev';
    expect(Object.keys(validateProfile(profile))).toEqual(['personal.email']);
    expect(normalizeProfile(profile).links.github).toBe('https://github.com/dev');
  });
});

describe('profile completion', () => {
  it('reports percentage and counts', () => {
    const empty = computeCompletion(createEmptyProfile(), null);
    expect(empty.percent).toBe(0);
    expect(empty.completed).toBe(0);

    const profile = createEmptyProfile();
    profile.personal.firstName = 'Asha';
    profile.personal.lastName = 'Rao';
    profile.personal.email = 'asha@example.com';
    const partial = computeCompletion(profile, { name: 'cv.pdf', type: 'application/pdf', size: 1, updatedAt: 0 });
    expect(partial.completed).toBe(3);
    expect(partial.percent).toBeGreaterThan(0);
    expect(partial.percent).toBeLessThan(100);
  });
});
