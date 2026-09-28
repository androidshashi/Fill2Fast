import { describe, expect, it } from 'vitest';
import { FieldDetector } from '../src/content/field-detector';
import { FieldType } from '../src/core/field-types';

function detect(html: string) {
  document.body.innerHTML = html;
  const detector = new FieldDetector();
  detector.addFrom(document);
  return detector.detect();
}

describe('FieldDetector — what is a candidate', () => {
  it('ignores hidden, disabled, readonly, password, submit and button controls', () => {
    const fields = detect(`
      <input type="hidden" name="email">
      <input type="password" name="password">
      <input type="submit" value="Apply">
      <input type="button" value="Go">
      <button>Apply</button>
      <input name="email" disabled>
      <input name="phone" readonly>
      <input name="first_name" style="display:none">
      <div hidden><input name="last_name"></div>
      <input type="date" name="start_date">
      <select name="skills" multiple><option>Kotlin</option></select>
      <input name="city">
    `);
    expect(fields.map((f) => f.fieldType)).toEqual([FieldType.CITY]);
  });

  it('collects input, textarea and select', () => {
    const fields = detect(`
      <input name="email">
      <textarea name="skills"></textarea>
      <select name="country"><option>India</option></select>
    `);
    expect(fields.map((f) => [f.kind, f.fieldType])).toEqual([
      ['text', FieldType.EMAIL],
      ['textarea', FieldType.SKILLS],
      ['select', FieldType.COUNTRY],
    ]);
  });

  it('skips custom comboboxes', () => {
    expect(detect(`<input role="combobox" aria-autocomplete="list" aria-label="Country">`)).toHaveLength(0);
  });
});

describe('FieldDetector — labels', () => {
  it('uses <label for>', () => {
    const [field] = detect(`<label for="x">Given Name</label><input id="x">`);
    expect(field.fieldType).toBe(FieldType.FIRST_NAME);
    expect(field.label).toBe('Given Name');
  });

  it('uses a wrapping label, excluding option text of nested selects', () => {
    const [field] = detect(`<label>Country <select><option>Select</option><option>India</option></select></label>`);
    expect(field.fieldType).toBe(FieldType.COUNTRY);
    expect(field.label).toBe('Country');
  });

  it('uses aria-labelledby and aria-label', () => {
    const fields = detect(`
      <span id="l1">Last name</span><input aria-labelledby="l1">
      <input aria-label="Phone number">
    `);
    expect(fields.map((f) => f.fieldType)).toEqual([FieldType.LAST_NAME, FieldType.PHONE]);
  });

  it('uses nearby text when there is no label (Lever-style markup)', () => {
    const [field] = detect(`
      <ul><li>
        <div class="application-label">LinkedIn URL</div>
        <div class="application-field"><input type="text" name="urls[0]"></div>
      </li></ul>
    `);
    expect(field.fieldType).toBe(FieldType.LINKEDIN);
    expect(field.label).toBe('LinkedIn URL');
  });

  it('does not borrow the label of a neighbouring field', () => {
    const fields = detect(`
      <div><div>Email</div><input name="a1"></div>
      <div><input name="a2"></div>
    `);
    expect(fields.map((f) => f.fieldType)).toEqual([FieldType.EMAIL, FieldType.UNKNOWN]);
  });

  it('uses the placeholder', () => {
    const [field] = detect(`<input placeholder="Enter your email">`);
    expect(field.fieldType).toBe(FieldType.EMAIL);
  });
});

describe('FieldDetector — radio groups and checkboxes', () => {
  it('groups radios by name and reads the question from the legend', () => {
    const fields = detect(`
      <fieldset>
        <legend>Are you legally authorized to work in India?</legend>
        <label><input type="radio" name="auth" value="1"> Yes</label>
        <label><input type="radio" name="auth" value="0"> No</label>
      </fieldset>
    `);
    expect(fields).toHaveLength(1);
    expect(fields[0].kind).toBe('radio');
    expect(fields[0].elements).toHaveLength(2);
    expect(fields[0].fieldType).toBe(FieldType.WORK_AUTHORIZATION);
  });

  it('reads the question from text before the group', () => {
    const fields = detect(`
      <div>
        <p>Will you require visa sponsorship?</p>
        <label><input type="radio" name="q2" value="yes"> Yes</label>
        <label><input type="radio" name="q2" value="no"> No</label>
      </div>
    `);
    expect(fields[0].fieldType).toBe(FieldType.SPONSORSHIP);
  });

  it('finds the question for deeply nested radios (Lever-style)', () => {
    const fields = detect(`
      <li>
        <div class="application-label">Are you willing to relocate to Bengaluru?</div>
        <div class="application-field"><ul>
          <li><label><input type="radio" name="cards[a][f0]" value="Yes"><span>Yes</span></label></li>
          <li><label><input type="radio" name="cards[a][f0]" value="No"><span>No</span></label></li>
        </ul></div>
      </li>
    `);
    expect(fields[0].label).toBe('Are you willing to relocate to Bengaluru?');
    expect(fields[0].fieldType).toBe(FieldType.RELOCATION);
  });

  it('reports the checked option as the current value', () => {
    const fields = detect(`
      <fieldset><legend>Willing to relocate?</legend>
        <label><input type="radio" name="r" value="y"> Yes</label>
        <label><input type="radio" name="r" value="n" checked> No</label>
      </fieldset>
    `);
    expect(fields[0].currentValue).toBe('No');
  });

  it('a checkbox labelled "Yes" takes its meaning from the question', () => {
    const [field] = detect(`<div><span>Are you willing to relocate?</span><label><input type="checkbox"> Yes</label></div>`);
    expect(field.fieldType).toBe(FieldType.RELOCATION);
  });
});

describe('FieldDetector — registry', () => {
  it('deduplicates repeated scans and keeps ids stable', () => {
    document.body.innerHTML = `<input name="email"><input name="phone">`;
    const detector = new FieldDetector();
    expect(detector.addFrom(document)).toBe(2);
    const first = detector.detect().map((f) => f.id);
    expect(detector.addFrom(document)).toBe(0);
    expect(detector.detect().map((f) => f.id)).toEqual(first);
  });

  it('adds only new subtrees and prunes removed controls', () => {
    document.body.innerHTML = `<form><input name="email"></form>`;
    const detector = new FieldDetector();
    detector.addFrom(document);

    const section = document.createElement('div');
    section.innerHTML = `<label>GitHub <input name="gh"></label>`;
    document.querySelector('form')!.append(section);
    expect(detector.addFrom(section)).toBe(1);
    expect(detector.detect().map((f) => f.fieldType)).toEqual([FieldType.EMAIL, FieldType.GITHUB]);

    section.remove();
    expect(detector.prune()).toBe(1);
    expect(detector.size).toBe(1);
  });

  it('finds controls inside open shadow roots', () => {
    const host = document.createElement('div');
    document.body.append(host);
    host.attachShadow({ mode: 'open' }).innerHTML = `<label for="e">Email</label><input id="e">`;
    const seen: ShadowRoot[] = [];
    const detector = new FieldDetector((root) => seen.push(root));
    detector.addFrom(document);
    expect(seen).toHaveLength(1);
    const [field] = detector.detect();
    expect(field.fieldType).toBe(FieldType.EMAIL);
  });
});
