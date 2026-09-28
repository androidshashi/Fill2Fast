export const FieldType = {
  FIRST_NAME: 'FIRST_NAME',
  LAST_NAME: 'LAST_NAME',
  FULL_NAME: 'FULL_NAME',
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  CITY: 'CITY',
  STATE: 'STATE',
  COUNTRY: 'COUNTRY',
  PINCODE: 'PINCODE',

  CURRENT_COMPANY: 'CURRENT_COMPANY',
  CURRENT_TITLE: 'CURRENT_TITLE',
  TOTAL_EXPERIENCE: 'TOTAL_EXPERIENCE',
  RELEVANT_EXPERIENCE: 'RELEVANT_EXPERIENCE',
  NOTICE_PERIOD: 'NOTICE_PERIOD',

  SKILLS: 'SKILLS',
  LINKEDIN: 'LINKEDIN',
  GITHUB: 'GITHUB',
  PORTFOLIO: 'PORTFOLIO',
  TWITTER: 'TWITTER',
  LEETCODE: 'LEETCODE',

  DEGREE: 'DEGREE',
  UNIVERSITY: 'UNIVERSITY',
  GRADUATION_YEAR: 'GRADUATION_YEAR',

  WORK_AUTHORIZATION: 'WORK_AUTHORIZATION',
  SPONSORSHIP: 'SPONSORSHIP',
  RELOCATION: 'RELOCATION',

  EXPECTED_SALARY: 'EXPECTED_SALARY',
  CURRENT_SALARY: 'CURRENT_SALARY',

  RESUME: 'RESUME',
  UNKNOWN: 'UNKNOWN',
} as const;

export type FieldType = (typeof FieldType)[keyof typeof FieldType];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  FIRST_NAME: 'First name',
  LAST_NAME: 'Last name',
  FULL_NAME: 'Full name',
  EMAIL: 'Email',
  PHONE: 'Phone',
  CITY: 'City',
  STATE: 'State',
  COUNTRY: 'Country',
  PINCODE: 'Postal code',
  CURRENT_COMPANY: 'Current company',
  CURRENT_TITLE: 'Current title',
  TOTAL_EXPERIENCE: 'Total experience',
  RELEVANT_EXPERIENCE: 'Relevant experience',
  NOTICE_PERIOD: 'Notice period',
  SKILLS: 'Skills',
  LINKEDIN: 'LinkedIn',
  GITHUB: 'GitHub',
  PORTFOLIO: 'Portfolio',
  TWITTER: 'Twitter / X',
  LEETCODE: 'LeetCode',
  DEGREE: 'Degree',
  UNIVERSITY: 'University',
  GRADUATION_YEAR: 'Graduation year',
  WORK_AUTHORIZATION: 'Work authorization',
  SPONSORSHIP: 'Requires sponsorship',
  RELOCATION: 'Willing to relocate',
  EXPECTED_SALARY: 'Expected salary',
  CURRENT_SALARY: 'Current salary',
  RESUME: 'Resume',
  UNKNOWN: 'Unknown field',
};

/** Field types whose profile value is a yes/no answer. */
export const BOOLEAN_FIELD_TYPES: ReadonlySet<FieldType> = new Set<FieldType>([
  FieldType.WORK_AUTHORIZATION,
  FieldType.SPONSORSHIP,
  FieldType.RELOCATION,
]);

/** Field types that are detected but never filled without explicit opt-in. */
export const SENSITIVE_FIELD_TYPES: ReadonlySet<FieldType> = new Set<FieldType>([
  FieldType.EXPECTED_SALARY,
  FieldType.CURRENT_SALARY,
]);

/** Field types whose value is a number of years (used for range-style select options). */
export const NUMERIC_FIELD_TYPES: ReadonlySet<FieldType> = new Set<FieldType>([
  FieldType.TOTAL_EXPERIENCE,
  FieldType.RELEVANT_EXPERIENCE,
]);
