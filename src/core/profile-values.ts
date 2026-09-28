import { FieldType, SENSITIVE_FIELD_TYPES } from './field-types';
import type { Profile, ResumeMeta, YesNo } from '../types/profile';

/** The profile value to put into a field. */
export type ProfileValue =
  | { kind: 'text'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'file'; name: string };

export type ValueResolution =
  | { ok: true; value: ProfileValue }
  | { ok: false; status: 'missing' | 'blocked' | 'unknown'; message: string };

const text = (value: string) => value.trim();

/** Where each text field type gets its value from. Add new mappings here. */
const TEXT_VALUES: Partial<Record<FieldType, (p: Profile) => string>> = {
  FIRST_NAME: (p) => text(p.personal.firstName),
  LAST_NAME: (p) => text(p.personal.lastName),
  FULL_NAME: (p) => text(p.personal.fullName) || [p.personal.firstName, p.personal.lastName].map(text).filter(Boolean).join(' '),
  EMAIL: (p) => text(p.personal.email),
  PHONE: (p) => text(p.personal.phone),
  CITY: (p) => text(p.personal.city),
  STATE: (p) => text(p.personal.state),
  COUNTRY: (p) => text(p.personal.country),
  PINCODE: (p) => text(p.personal.pincode),
  CURRENT_COMPANY: (p) => text(p.professional.currentCompany),
  CURRENT_TITLE: (p) => text(p.professional.currentTitle),
  TOTAL_EXPERIENCE: (p) => text(p.professional.totalExperience),
  RELEVANT_EXPERIENCE: (p) => text(p.professional.relevantExperience) || text(p.professional.totalExperience),
  NOTICE_PERIOD: (p) => text(p.professional.noticePeriod),
  SKILLS: (p) => [...p.skills.primarySkills, ...p.skills.secondarySkills].map(text).filter(Boolean).join(', '),
  LINKEDIN: (p) => text(p.links.linkedin),
  GITHUB: (p) => text(p.links.github),
  PORTFOLIO: (p) => text(p.links.portfolio),
  TWITTER: (p) => text(p.links.twitter),
  LEETCODE: (p) => text(p.links.leetcode),
  DEGREE: (p) => text(p.education.degree),
  UNIVERSITY: (p) => text(p.education.university),
  GRADUATION_YEAR: (p) => text(p.education.graduationYear),
  EXPECTED_SALARY: (p) => text(p.compensation.expectedSalary),
  CURRENT_SALARY: (p) => text(p.compensation.currentSalary),
};

const BOOLEAN_VALUES: Partial<Record<FieldType, (p: Profile) => YesNo>> = {
  WORK_AUTHORIZATION: (p) => p.answers.workAuthorization,
  SPONSORSHIP: (p) => p.answers.requiresSponsorship,
  RELOCATION: (p) => p.answers.willingToRelocate,
};

const NOT_CONFIGURED: ValueResolution = { ok: false, status: 'missing', message: 'Not configured' };

export function resolveProfileValue(profile: Profile, fieldType: FieldType, resume: ResumeMeta | null): ValueResolution {
  if (fieldType === FieldType.UNKNOWN) return { ok: false, status: 'unknown', message: 'Unknown field' };

  if (SENSITIVE_FIELD_TYPES.has(fieldType) && !profile.compensation.allowAutofill) {
    return { ok: false, status: 'blocked', message: 'Salary autofill is turned off' };
  }

  if (fieldType === FieldType.RESUME) {
    return resume ? { ok: true, value: { kind: 'file', name: resume.name } } : NOT_CONFIGURED;
  }

  const booleanGetter = BOOLEAN_VALUES[fieldType];
  if (booleanGetter) {
    const answer = booleanGetter(profile);
    return answer ? { ok: true, value: { kind: 'boolean', value: answer === 'yes' } } : NOT_CONFIGURED;
  }

  const textGetter = TEXT_VALUES[fieldType];
  if (!textGetter) return { ok: false, status: 'unknown', message: 'Unsupported field' };
  const value = textGetter(profile);
  return value ? { ok: true, value: { kind: 'text', value } } : NOT_CONFIGURED;
}
