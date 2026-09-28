import { FieldType } from './field-types';
import type { FieldKind } from '../types/messages';

/**
 * Declarative classification rules. To support a new field, add a rule here
 * (and a profile value in profile-values.ts) — no classifier changes needed.
 *
 * Keyword syntax:
 *   "first name"  matches on word boundaries, spacing/casing/underscores ignored
 *                 (so it also matches "firstName", "first_name", "FIRSTNAME")
 *   "=name"       matches only when it is the entire signal ("Name", name="name")
 */
export interface FieldRule {
  type: FieldType;
  /** HTML autocomplete tokens that identify this field with near certainty. */
  autocomplete?: string[];
  /** Input `type` attributes that identify this field (e.g. type="email"). */
  inputTypes?: string[];
  keywords: string[];
  /** If any of these match a signal, this rule ignores that signal. */
  exclude?: string[];
  /** Question-style fields ("Are you legally authorized to work…") tolerate long labels. */
  question?: boolean;
  /** Element kinds this rule may apply to. Defaults to text-like kinds. */
  kinds?: FieldKind[];
}

export const TEXT_KINDS: FieldKind[] = ['text', 'textarea', 'select'];
const BOOLEAN_KINDS: FieldKind[] = ['select', 'radio', 'checkbox'];

const PEOPLE_EXCLUDES = ['referrer', 'referral', 'reference', 'recruiter', 'manager', 'emergency', 'spouse', 'parent', 'guardian'];

export const FIELD_RULES: FieldRule[] = [
  {
    type: FieldType.FIRST_NAME,
    autocomplete: ['given-name'],
    keywords: ['first name', 'given name', 'fname', 'forename', '=first'],
    exclude: [...PEOPLE_EXCLUDES, 'preferred', 'nick'],
  },
  {
    type: FieldType.LAST_NAME,
    autocomplete: ['family-name'],
    keywords: ['last name', 'surname', 'family name', 'lname', '=last'],
    exclude: [...PEOPLE_EXCLUDES],
  },
  {
    type: FieldType.FULL_NAME,
    autocomplete: ['name'],
    keywords: ['full name', '=name', 'legal name', 'candidate name', 'applicant name', 'complete name'],
    exclude: [
      ...PEOPLE_EXCLUDES, 'first', 'last', 'middle', 'company', 'user', 'username', 'file', 'school',
      'university', 'college', 'employer', 'preferred', 'nick', 'project', 'account', 'institution',
    ],
  },
  {
    type: FieldType.EMAIL,
    autocomplete: ['email'],
    inputTypes: ['email'],
    keywords: ['email', 'email address', 'e mail'],
    exclude: [...PEOPLE_EXCLUDES],
  },
  {
    type: FieldType.PHONE,
    autocomplete: ['tel', 'tel-national'],
    inputTypes: ['tel'],
    keywords: ['phone', 'mobile', 'telephone', 'contact number', 'phone number', 'mobile number', 'cell', 'cellphone', 'whatsapp'],
    exclude: [...PEOPLE_EXCLUDES, 'code', 'extension', 'ext', 'device', 'type', 'country'],
  },
  {
    type: FieldType.CITY,
    autocomplete: ['address-level2'],
    keywords: ['city', 'town', 'location', 'current location', 'city of residence', 'current city'],
    exclude: ['preferred', 'desired', 'relocate', 'relocation', 'birth', 'job', 'work', 'office'],
  },
  {
    type: FieldType.STATE,
    autocomplete: ['address-level1'],
    keywords: ['state', 'province', 'state province'],
    exclude: ['please', 'status', 'birth', 'why', 'briefly'],
  },
  {
    type: FieldType.COUNTRY,
    autocomplete: ['country', 'country-name'],
    keywords: ['country', 'country of residence', 'current country'],
    exclude: ['code', 'phone', 'dial', 'citizenship', 'nationality', 'passport', 'birth', 'issued', 'visa', 'authorized', 'authorised', 'work'],
  },
  {
    type: FieldType.PINCODE,
    autocomplete: ['postal-code'],
    keywords: ['pincode', 'pin code', 'postal code', 'zip', 'zip code', 'postcode', '=pin'],
  },
  {
    type: FieldType.CURRENT_COMPANY,
    autocomplete: ['organization'],
    keywords: ['current company', 'company', 'current employer', 'employer', 'company name', 'organization', 'organisation', 'current organization'],
    exclude: ['previous', 'former', 'past', 'website', 'url', 'email', 'hear', 'why', 'refer', 'referral', 'about', 'size', 'address', 'type'],
  },
  {
    type: FieldType.CURRENT_TITLE,
    autocomplete: ['organization-title'],
    keywords: ['current title', 'job title', 'current job title', 'current role', 'current position', 'designation', 'current designation', '=title', '=role', '=position'],
    exclude: ['previous', 'former', 'past', 'applying', 'apply', 'desired', 'preferred', 'interested'],
  },
  {
    type: FieldType.TOTAL_EXPERIENCE,
    keywords: [
      'total experience', 'years of experience', 'experience years', 'total work experience', 'total years',
      'years experience', 'experience in years', '=experience', 'yoe', 'total exp', 'work experience years',
    ],
    exclude: ['relevant', 'with', 'using', 'describe', 'tell', 'list'],
  },
  {
    type: FieldType.RELEVANT_EXPERIENCE,
    keywords: ['relevant experience', 'relevant years', 'relevant work experience', 'years of relevant experience', 'relevant exp'],
  },
  {
    type: FieldType.NOTICE_PERIOD,
    keywords: ['notice period', 'notice', 'days notice'],
  },
  {
    type: FieldType.SKILLS,
    keywords: ['skills', 'key skills', 'technical skills', 'skill set', 'skillset', 'technologies', 'tech stack', 'primary skills'],
    exclude: ['rate', 'rating', 'level'],
  },
  {
    type: FieldType.LINKEDIN,
    keywords: ['linkedin', 'linked in', 'linkedin profile', 'linkedin url'],
  },
  {
    type: FieldType.GITHUB,
    keywords: ['github', 'git hub', 'github profile', 'github url'],
  },
  {
    type: FieldType.PORTFOLIO,
    keywords: ['portfolio', 'personal website', 'website', 'personal site', 'portfolio url', 'personal url', 'blog', '=url'],
    exclude: ['company', 'linkedin', 'github', 'twitter', 'leetcode'],
  },
  {
    type: FieldType.TWITTER,
    keywords: ['twitter', 'twitter handle', 'x handle', 'x profile', 'x com'],
  },
  {
    type: FieldType.LEETCODE,
    keywords: ['leetcode', 'leet code'],
  },
  {
    type: FieldType.DEGREE,
    keywords: ['degree', 'qualification', 'highest qualification', 'education level', 'highest education', 'level of education'],
    exclude: ['year', 'date', 'discipline', 'major', 'field', 'grade', 'gpa', 'percentage'],
  },
  {
    type: FieldType.UNIVERSITY,
    keywords: ['university', 'college', 'school', 'institution', 'university name', 'school name', 'college name', 'alma mater'],
    exclude: ['year', 'date', 'high school', 'degree', 'gpa', 'grade', 'location', 'city'],
  },
  {
    type: FieldType.GRADUATION_YEAR,
    keywords: ['graduation year', 'year of graduation', 'graduation date', 'passing year', 'year of passing', 'grad year', 'graduation', 'completion year'],
  },
  {
    type: FieldType.WORK_AUTHORIZATION,
    keywords: [
      'authorized to work', 'authorised to work', 'work authorization', 'work authorisation', 'legally authorized',
      'legally authorised', 'legally eligible', 'eligible to work', 'right to work', 'work permit', 'legally permitted',
    ],
    exclude: ['sponsorship', 'sponsor'],
    question: true,
    kinds: BOOLEAN_KINDS,
  },
  {
    type: FieldType.SPONSORSHIP,
    keywords: ['sponsorship', 'sponsor', 'visa sponsorship', 'require sponsorship', 'require a visa', 'need a visa'],
    question: true,
    kinds: BOOLEAN_KINDS,
  },
  {
    type: FieldType.RELOCATION,
    keywords: ['relocate', 'relocation', 'relocating', 'willing to move', 'open to relocation'],
    question: true,
    kinds: BOOLEAN_KINDS,
  },
  {
    type: FieldType.EXPECTED_SALARY,
    keywords: [
      'expected salary', 'salary expectation', 'salary expectations', 'expected ctc', 'ectc', 'desired salary',
      'expected compensation', 'compensation expectation', 'compensation expectations', 'desired compensation',
      'salary requirement', 'salary requirements', 'expected pay', '=salary',
    ],
  },
  {
    type: FieldType.CURRENT_SALARY,
    keywords: ['current salary', 'current ctc', 'cctc', 'current compensation', 'present salary', 'current pay', 'current base salary'],
  },
  {
    type: FieldType.RESUME,
    keywords: ['resume', 'cv', 'curriculum vitae', 'resume cv'],
    exclude: ['cover', 'letter', 'transcript', 'portfolio', 'photo', 'picture'],
    kinds: ['file'],
  },
];
