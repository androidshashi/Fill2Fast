import { describe, expect, it } from 'vitest';
import { classifyField, type FieldSignals } from '../src/content/field-mapper';
import { FieldType } from '../src/core/field-types';

const text = (signals: Omit<FieldSignals, 'kind'>): FieldSignals => ({ kind: 'text', ...signals });

describe('classifyField — first name variants', () => {
  it.each(['firstName', 'first_name', 'given_name', 'fname', 'first-name', 'FIRSTNAME', 'job_application[first_name]', 'legalNameSection_firstName'])(
    'name="%s" → FIRST_NAME',
    (name) => {
      expect(classifyField(text({ name })).fieldType).toBe(FieldType.FIRST_NAME);
    },
  );

  it.each(['Given Name', 'First Name', 'First name *', 'Please enter your first name'])('label "%s" → FIRST_NAME', (label) => {
    expect(classifyField(text({ label })).fieldType).toBe(FieldType.FIRST_NAME);
  });

  it('autocomplete="given-name" → FIRST_NAME', () => {
    expect(classifyField(text({ autocomplete: 'given-name' })).fieldType).toBe(FieldType.FIRST_NAME);
  });
});

describe('classifyField — common fields', () => {
  const cases: Array<[Omit<FieldSignals, 'kind'>, FieldType]> = [
    [{ name: 'lastName' }, FieldType.LAST_NAME],
    [{ label: 'Surname' }, FieldType.LAST_NAME],
    [{ autocomplete: 'family-name' }, FieldType.LAST_NAME],
    [{ name: 'name' }, FieldType.FULL_NAME],
    [{ label: 'Full name' }, FieldType.FULL_NAME],
    [{ autocomplete: 'email' }, FieldType.EMAIL],
    [{ inputType: 'email' }, FieldType.EMAIL],
    [{ placeholder: 'Enter your email' }, FieldType.EMAIL],
    [{ label: 'E-mail address' }, FieldType.EMAIL],
    [{ autocomplete: 'tel' }, FieldType.PHONE],
    [{ label: 'Mobile number' }, FieldType.PHONE],
    [{ name: 'contact_number' }, FieldType.PHONE],
    [{ label: 'Telephone' }, FieldType.PHONE],
    [{ label: 'City' }, FieldType.CITY],
    [{ label: 'Current location' }, FieldType.CITY],
    [{ label: 'State / Province' }, FieldType.STATE],
    [{ label: 'Country' }, FieldType.COUNTRY],
    [{ label: 'Pincode' }, FieldType.PINCODE],
    [{ name: 'zip_code' }, FieldType.PINCODE],
    [{ label: 'Current Company' }, FieldType.CURRENT_COMPANY],
    [{ name: 'org' }, FieldType.UNKNOWN],
    [{ label: 'Current job title' }, FieldType.CURRENT_TITLE],
    [{ label: 'Total years of experience' }, FieldType.TOTAL_EXPERIENCE],
    [{ label: 'Relevant experience (years)' }, FieldType.RELEVANT_EXPERIENCE],
    [{ label: 'Notice period (days)' }, FieldType.NOTICE_PERIOD],
    [{ label: 'Key skills' }, FieldType.SKILLS],
    [{ label: 'LinkedIn Profile' }, FieldType.LINKEDIN],
    [{ name: 'urls[LinkedIn]' }, FieldType.LINKEDIN],
    [{ name: 'urls[GitHub]' }, FieldType.GITHUB],
    [{ label: 'Portfolio URL' }, FieldType.PORTFOLIO],
    [{ label: 'Personal website' }, FieldType.PORTFOLIO],
    [{ label: 'Twitter' }, FieldType.TWITTER],
    [{ label: 'LeetCode profile' }, FieldType.LEETCODE],
    [{ label: 'Degree' }, FieldType.DEGREE],
    [{ label: 'University' }, FieldType.UNIVERSITY],
    [{ label: 'Graduation year' }, FieldType.GRADUATION_YEAR],
    [{ label: 'Expected CTC' }, FieldType.EXPECTED_SALARY],
    [{ label: 'What is your current CTC?' }, FieldType.CURRENT_SALARY],
    [{ label: 'Salary expectations' }, FieldType.EXPECTED_SALARY],
  ];

  it.each(cases)('%j → %s', (signals, expected) => {
    expect(classifyField(text(signals)).fieldType).toBe(expected);
  });
});

describe('classifyField — things that must NOT match', () => {
  it.each([
    [{ label: 'Referrer email' }, FieldType.EMAIL],
    [{ label: 'Company name' }, FieldType.FULL_NAME],
    [{ label: 'Phone country code' }, FieldType.PHONE],
    [{ label: 'Please state why you want to join' }, FieldType.STATE],
    [{ label: 'Statement of purpose' }, FieldType.STATE],
    [{ label: 'Previous company' }, FieldType.CURRENT_COMPANY],
    [{ label: 'Years of experience with React' }, FieldType.TOTAL_EXPERIENCE],
    [{ label: 'Preferred location' }, FieldType.CITY],
    [{ label: 'Hiring manager name' }, FieldType.FULL_NAME],
    [{ label: 'Country code' }, FieldType.COUNTRY],
  ] as Array<[Omit<FieldSignals, 'kind'>, FieldType]>)('%j is not %s', (signals, notExpected) => {
    expect(classifyField(text(signals)).fieldType).not.toBe(notExpected);
  });

  it('type="email" does not override a label about someone else', () => {
    expect(classifyField(text({ inputType: 'email', label: "Your manager's email" })).fieldType).not.toBe(FieldType.EMAIL);
  });

  it('an unrelated field is UNKNOWN', () => {
    expect(classifyField(text({ name: 'q_12345', label: 'Why do you want to work here?' })).fieldType).toBe(FieldType.UNKNOWN);
  });

  it('a field with no signals is UNKNOWN with zero confidence', () => {
    expect(classifyField(text({}))).toEqual({ fieldType: FieldType.UNKNOWN, confidence: 0, source: null });
  });
});

describe('classifyField — element kinds', () => {
  it('yes/no questions map on radio groups', () => {
    const result = classifyField({ kind: 'radio', label: 'Are you legally authorized to work in India?' });
    expect(result.fieldType).toBe(FieldType.WORK_AUTHORIZATION);
    expect(result.confidence).toBeGreaterThanOrEqual(75);
  });

  it('sponsorship and relocation questions', () => {
    expect(classifyField({ kind: 'select', label: 'Will you now or in the future require visa sponsorship?' }).fieldType).toBe(FieldType.SPONSORSHIP);
    expect(classifyField({ kind: 'checkbox', label: 'I am willing to relocate' }).fieldType).toBe(FieldType.RELOCATION);
  });

  it('yes/no rules do not apply to free text inputs', () => {
    expect(classifyField({ kind: 'text', label: 'Are you willing to relocate?' }).fieldType).toBe(FieldType.UNKNOWN);
  });

  it('a checkbox never maps to a text field type', () => {
    expect(classifyField({ kind: 'checkbox', label: 'Email me about future openings' }).fieldType).toBe(FieldType.UNKNOWN);
  });

  it('resume only maps on file inputs, cover letters do not', () => {
    expect(classifyField({ kind: 'file', label: 'Resume/CV' }).fieldType).toBe(FieldType.RESUME);
    expect(classifyField({ kind: 'file', label: 'Cover letter' }).fieldType).toBe(FieldType.UNKNOWN);
    expect(classifyField({ kind: 'text', label: 'Resume' }).fieldType).toBe(FieldType.UNKNOWN);
  });
});

describe('classifyField — confidence', () => {
  it('autocomplete is the strongest single signal', () => {
    expect(classifyField(text({ autocomplete: 'email' })).confidence).toBe(98);
  });

  it('follows the signal priority for single signals', () => {
    const byName = classifyField(text({ name: 'email' })).confidence;
    const byLabel = classifyField(text({ label: 'Email' })).confidence;
    const byPlaceholder = classifyField(text({ placeholder: 'Email' })).confidence;
    const byNearby = classifyField(text({ nearbyText: 'Email' })).confidence;
    expect(byName).toBe(90);
    expect(byLabel).toBe(85);
    expect(byPlaceholder).toBe(80);
    expect(byNearby).toBeLessThan(byPlaceholder);
  });

  it('agreeing signals increase confidence', () => {
    const single = classifyField(text({ label: 'Email' })).confidence;
    const combined = classifyField(text({ label: 'Email', name: 'email', placeholder: 'you@example.com' })).confidence;
    expect(combined).toBeGreaterThan(single);
    expect(combined).toBeLessThanOrEqual(99);
  });

  it('long labels with a small keyword are less confident than exact labels', () => {
    const exact = classifyField(text({ label: 'Phone' })).confidence;
    const loose = classifyField(text({ label: 'Phone (we will only call you about this role)' })).confidence;
    expect(loose).toBeLessThan(exact);
  });

  it('several keywords of the same field together cover a label', () => {
    const result = classifyField(text({ label: 'Location (City)' }));
    expect(result.fieldType).toBe(FieldType.CITY);
    expect(result.confidence).toBe(85);
  });

  it('conflicting interpretations lower confidence', () => {
    const clear = classifyField(text({ label: 'City' })).confidence;
    const conflicting = classifyField(text({ label: 'City', name: 'country' })).confidence;
    expect(conflicting).toBeLessThan(clear);
  });
});
