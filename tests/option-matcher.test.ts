import { describe, expect, it } from 'vitest';
import { isPlaceholderOption, matchBooleanOption, matchOption, parseRange, type OptionLike } from '../src/core/option-matcher';

const opts = (...texts: string[]): OptionLike[] => texts.map((text) => ({ text, value: text }));

describe('matchOption', () => {
  it.each(['India', 'india', 'INDIA', ' India '])('matches "%s" case-insensitively', (value) => {
    expect(matchOption(opts('Select…', 'India', 'United States'), value)).toEqual({ status: 'match', index: 1 });
  });

  it('matches by option value when the text differs', () => {
    const options = [
      { text: 'Choose a country', value: '' },
      { text: 'Bhārat (India)', value: 'IN' },
      { text: 'United States', value: 'US' },
    ];
    expect(matchOption(options, 'IN')).toEqual({ status: 'match', index: 1 });
  });

  it('matches common aliases', () => {
    expect(matchOption(opts('India', 'United States of America'), 'USA')).toEqual({ status: 'match', index: 1 });
    expect(matchOption(opts('UK', 'Ireland'), 'United Kingdom')).toEqual({ status: 'match', index: 0 });
  });

  it('matches options that contain the value as whole words', () => {
    expect(matchOption(opts('India (+91)', 'Indonesia (+62)'), 'India')).toEqual({ status: 'match', index: 0 });
  });

  it('prefers an exact match over a contains match', () => {
    expect(matchOption(opts('India', 'British Indian Ocean Territory', 'India (Other)'), 'India')).toEqual({ status: 'match', index: 0 });
  });

  it('does not guess between ambiguous options', () => {
    expect(matchOption(opts('Georgia (US state)', 'Georgia (country)'), 'Georgia').status).toBe('ambiguous');
    expect(matchOption(opts('India', 'India'), 'India').status).toBe('ambiguous');
  });

  it('reports no match', () => {
    expect(matchOption(opts('Canada', 'Mexico'), 'India')).toEqual({ status: 'none' });
    expect(matchOption(opts('Canada'), '')).toEqual({ status: 'none' });
  });

  it('never selects placeholder options', () => {
    expect(matchOption([{ text: 'Select', value: 'select' }], 'Select')).toEqual({ status: 'none' });
  });

  it('matches years of experience against range options', () => {
    const ranges = opts('Select', '0-1 years', '1-3 years', '3–5 years', '5+ years');
    expect(matchOption(ranges, '4', { numeric: true })).toEqual({ status: 'match', index: 3 });
    expect(matchOption(ranges, '7', { numeric: true })).toEqual({ status: 'match', index: 4 });
    expect(matchOption(ranges, '0.5', { numeric: true })).toEqual({ status: 'match', index: 1 });
    // 3 is in both "1-3" and "3-5": ambiguous, so no guess.
    expect(matchOption(ranges, '3', { numeric: true }).status).toBe('ambiguous');
    // Ranges are only used when asked.
    expect(matchOption(ranges, '4').status).toBe('none');
  });
});

describe('matchBooleanOption', () => {
  it('picks Yes / No', () => {
    expect(matchBooleanOption(opts('Select', 'Yes', 'No'), true)).toEqual({ status: 'match', index: 1 });
    expect(matchBooleanOption(opts('Select', 'Yes', 'No'), false)).toEqual({ status: 'match', index: 2 });
  });

  it('handles descriptive yes/no options', () => {
    const options = opts('Yes, I am authorized', 'No, I am not authorized');
    expect(matchBooleanOption(options, true)).toEqual({ status: 'match', index: 0 });
    expect(matchBooleanOption(options, false)).toEqual({ status: 'match', index: 1 });
  });

  it('does not treat "Not sure" or "None" as No', () => {
    expect(matchBooleanOption(opts('Not sure', 'None of the above'), false)).toEqual({ status: 'none' });
  });

  it('refuses ambiguous option sets', () => {
    expect(matchBooleanOption(opts('Yes, with sponsorship', 'Yes, without sponsorship', 'No'), true).status).toBe('ambiguous');
  });
});

describe('helpers', () => {
  it('detects placeholders', () => {
    expect(isPlaceholderOption({ text: 'Select...', value: '' })).toBe(true);
    expect(isPlaceholderOption({ text: '-- Choose --', value: '' })).toBe(true);
    expect(isPlaceholderOption({ text: 'Please select a country', value: '' })).toBe(true);
    expect(isPlaceholderOption({ text: 'India', value: 'IN' })).toBe(false);
  });

  it('parses ranges', () => {
    expect(parseRange('3-5 years')).toEqual({ min: 3, max: 5 });
    expect(parseRange('3 to 5 years')).toEqual({ min: 3, max: 5 });
    expect(parseRange('10+ years')).toEqual({ min: 10, max: Infinity });
    expect(parseRange('More than 10')).toEqual({ min: 10, max: Infinity });
    expect(parseRange('Less than 1 year')?.max).toBeLessThan(1);
    expect(parseRange('Senior')).toBeNull();
  });
});
