/**
 * The user's job-application profile.
 *
 * The profile is grouped into sections. New fields can be added to any section
 * later: `mergeWithDefaults` (core/profile-defaults.ts) fills in defaults for
 * fields missing from older stored profiles, so no migration is needed for
 * additive changes. Breaking changes should bump `PROFILE_VERSION`.
 */

export const PROFILE_VERSION = 1;

/** Answer to a yes/no application question. Empty string = not configured. */
export type YesNo = 'yes' | 'no' | '';

export type RemotePreference = '' | 'remote' | 'hybrid' | 'onsite' | 'flexible';

export type EmploymentType = '' | 'full-time' | 'part-time' | 'contract' | 'internship' | 'freelance';

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface ProfessionalInfo {
  currentCompany: string;
  currentTitle: string;
  /** Years, stored as text so the user controls formatting (e.g. "5" or "5.5"). */
  totalExperience: string;
  relevantExperience: string;
  noticePeriod: string;
  availability: string;
}

export interface Skills {
  primarySkills: string[];
  secondarySkills: string[];
}

export interface Links {
  linkedin: string;
  github: string;
  portfolio: string;
  twitter: string;
  leetcode: string;
}

export interface Education {
  degree: string;
  university: string;
  graduationYear: string;
}

export interface JobPreferences {
  preferredRole: string;
  preferredLocation: string;
  remotePreference: RemotePreference;
  employmentType: EmploymentType;
}

export interface ApplicationAnswers {
  workAuthorization: YesNo;
  requiresSponsorship: YesNo;
  willingToRelocate: YesNo;
}

/**
 * Salary values are sensitive. They are only ever filled when the user has
 * explicitly turned on `allowAutofill`.
 */
export interface Compensation {
  expectedSalary: string;
  currentSalary: string;
  allowAutofill: boolean;
}

export interface Profile {
  version: number;
  personal: PersonalInfo;
  professional: ProfessionalInfo;
  skills: Skills;
  links: Links;
  education: Education;
  preferences: JobPreferences;
  answers: ApplicationAnswers;
  compensation: Compensation;
  updatedAt: number | null;
}

export interface Settings {
  /** Fields at or above this confidence are pre-selected in the popup. */
  autoSelectThreshold: number;
}

/** Metadata about the stored resume (the file bytes are stored separately). */
export interface ResumeMeta {
  name: string;
  type: string;
  size: number;
  updatedAt: number;
}

export interface StoredResume extends ResumeMeta {
  /** File contents, base64 encoded. */
  data: string;
}

/** Recursive partial, used for `updateProfile`. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[] ? U[] : T[K] extends object ? DeepPartial<T[K]> : T[K];
};
