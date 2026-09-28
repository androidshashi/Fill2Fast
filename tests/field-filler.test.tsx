import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { FieldDetector, type DetectedField } from '../src/content/field-detector';
import { performFill, planFill } from '../src/content/field-filler';
import { FieldType } from '../src/core/field-types';
import { createEmptyProfile } from '../src/core/profile-defaults';
import type { Profile, StoredResume } from '../src/types/profile';

function makeProfile(): Profile {
  const p = createEmptyProfile();
  p.personal.firstName = 'Asha';
  p.personal.lastName = 'Rao';
  p.personal.email = 'asha@example.com';
  p.personal.country = 'india';
  p.professional.totalExperience = '4';
  p.skills.primarySkills = ['Kotlin', 'Flutter'];
  p.answers.workAuthorization = 'yes';
  p.answers.requiresSponsorship = 'no';
  p.answers.willingToRelocate = 'yes';
  return p;
}

const noResume = { loadResume: async () => null };

function scan(): DetectedField[] {
  const detector = new FieldDetector();
  detector.addFrom(document);
  return detector.detect();
}

async function fillAll(profile = makeProfile(), context = noResume) {
  const results = [];
  for (const field of scan()) results.push(await performFill(field, planFill(field, profile, null), context));
  return results;
}

describe('filling plain DOM controls', () => {
  it('fills input and textarea and fires input/change/blur', async () => {
    document.body.innerHTML = `<input name="first_name"><textarea name="skills"></textarea>`;
    const input = document.querySelector('input')!;
    const events: string[] = [];
    for (const type of ['input', 'change', 'blur']) input.addEventListener(type, () => events.push(type));

    const results = await fillAll();
    expect(results.every((r) => r.status === 'filled')).toBe(true);
    expect(input.value).toBe('Asha');
    expect(document.querySelector('textarea')!.value).toBe('Kotlin, Flutter');
    expect(events).toEqual(['input', 'change', 'blur']);
  });

  it('selects the matching <select> option case-insensitively', async () => {
    document.body.innerHTML = `
      <label for="c">Country</label>
      <select id="c"><option value="">Select…</option><option value="us">United States</option><option value="in">India</option></select>`;
    const select = document.querySelector('select')!;
    const onChange = vi.fn();
    select.addEventListener('change', onChange);

    await fillAll();
    expect(select.value).toBe('in');
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('leaves a select alone when no option matches', async () => {
    document.body.innerHTML = `<label for="c">Country</label><select id="c"><option value="">Select</option><option>Canada</option></select>`;
    const [field] = scan();
    const plan = planFill(field, makeProfile(), null);
    expect(plan.suggestion.status).toBe('no-option');
    expect((await performFill(field, plan, noResume)).status).toBe('skipped');
    expect(document.querySelector('select')!.selectedIndex).toBe(0);
  });

  it('picks the matching experience range', async () => {
    document.body.innerHTML = `
      <label for="e">Total years of experience</label>
      <select id="e"><option>Select</option><option>0-2</option><option>3-5</option><option>6+</option></select>`;
    await fillAll();
    expect(document.querySelector('select')!.value).toBe('3-5');
  });

  it('checks the Yes radio for a clear yes/no question', async () => {
    document.body.innerHTML = `
      <fieldset><legend>Are you legally authorized to work in India?</legend>
        <label><input type="radio" name="auth" value="a"> Yes</label>
        <label><input type="radio" name="auth" value="b"> No</label>
      </fieldset>
      <fieldset><legend>Will you require sponsorship?</legend>
        <label><input type="radio" name="sp" value="a"> Yes</label>
        <label><input type="radio" name="sp" value="b"> No</label>
      </fieldset>`;
    await fillAll();
    const checked = Array.from(document.querySelectorAll<HTMLInputElement>('input:checked')).map((r) => `${r.name}=${r.value}`);
    expect(checked).toEqual(['auth=a', 'sp=b']);
  });

  it('does not answer ambiguous radio questions', async () => {
    document.body.innerHTML = `
      <fieldset><legend>Are you authorized to work in the US?</legend>
        <label><input type="radio" name="q" value="1"> Yes, with sponsorship</label>
        <label><input type="radio" name="q" value="2"> Yes, without sponsorship</label>
        <label><input type="radio" name="q" value="3"> No</label>
      </fieldset>`;
    const [field] = scan();
    expect(planFill(field, makeProfile(), null).suggestion.status).toBe('ambiguous');
    await fillAll();
    expect(document.querySelector('input:checked')).toBeNull();
  });

  it('checks a checkbox for a boolean question', async () => {
    document.body.innerHTML = `<label><input type="checkbox" name="relocate"> I am willing to relocate</label>`;
    await fillAll();
    expect(document.querySelector<HTMLInputElement>('input')!.checked).toBe(true);
  });

  it('never fills unknown fields or inserts empty values', async () => {
    document.body.innerHTML = `
      <label for="q">Why do you want to work here?</label><textarea id="q"></textarea>
      <label for="p">Phone</label><input id="p">`;
    const results = await fillAll();
    expect(results.map((r) => r.status)).toEqual(['skipped', 'skipped']);
    expect(document.querySelector('textarea')!.value).toBe('');
    expect(document.querySelector('input')!.value).toBe('');
  });

  it('reports a failed field and keeps going', async () => {
    document.body.innerHTML = `<input name="first_name"><input name="last_name">`;
    const first = document.querySelector('input')!;
    // Simulate a page that breaks our interaction with the first field.
    Object.defineProperty(first, 'focus', {
      value: () => {
        throw new Error('boom');
      },
    });
    const results = await fillAll();
    expect(results[0]).toMatchObject({ status: 'failed' });
    expect(results[0].message).toMatch(/^Could not fill this field/);
    expect(results[1]).toMatchObject({ status: 'filled' });
    expect(document.querySelectorAll('input')[1].value).toBe('Rao');
  });

  it('reports already-filled fields', () => {
    document.body.innerHTML = `<input name="email" value="asha@example.com">`;
    const [field] = scan();
    expect(planFill(field, makeProfile(), null).suggestion.status).toBe('filled');
  });

  it('uses the latest profile values', async () => {
    document.body.innerHTML = `<input name="email">`;
    const profile = makeProfile();
    profile.personal.email = 'new@example.com';
    await fillAll(profile);
    expect(document.querySelector('input')!.value).toBe('new@example.com');
  });
});

describe('resume upload', () => {
  const resume: StoredResume = { name: 'asha-cv.pdf', type: 'application/pdf', size: 3, data: 'YWJj', updatedAt: 1 };

  beforeAll(() => {
    // jsdom has no DataTransfer; a minimal stand-in lets us exercise attachFile.
    class FakeDataTransfer {
      private list: File[] = [];
      items = { add: (file: File) => this.list.push(file) };
      get files() {
        return Object.assign([...this.list], { item: (i: number) => this.list[i] ?? null });
      }
    }
    vi.stubGlobal('DataTransfer', FakeDataTransfer);
  });

  it('attaches the stored resume to a resume file input', async () => {
    document.body.innerHTML = `<label for="r">Resume/CV</label><input type="file" id="r">`;
    const input = document.querySelector('input')!;
    let files: File[] = [];
    Object.defineProperty(input, 'files', { get: () => files, set: (v: File[]) => (files = v) });
    const onChange = vi.fn();
    input.addEventListener('change', onChange);

    const [field] = scan();
    expect(field.fieldType).toBe(FieldType.RESUME);
    const plan = planFill(field, makeProfile(), resume);
    expect(plan.suggestion).toMatchObject({ status: 'ready', displayValue: 'asha-cv.pdf' });

    const result = await performFill(field, plan, { loadResume: async () => resume });
    expect(result.status).toBe('filled');
    expect(files[0].name).toBe('asha-cv.pdf');
    expect(await files[0].text()).toBe('abc');
    expect(onChange).toHaveBeenCalled();
  });

  it('reports a failure when the page does not accept the file', async () => {
    document.body.innerHTML = `<label for="r">Resume</label><input type="file" id="r">`;
    const [field] = scan();
    const result = await performFill(field, planFill(field, makeProfile(), resume), { loadResume: async () => resume });
    expect(result.status).toBe('failed');
  });

  it('shows "not configured" when no resume is stored', () => {
    document.body.innerHTML = `<label for="r">Resume</label><input type="file" id="r">`;
    const [field] = scan();
    expect(planFill(field, makeProfile(), null).suggestion.status).toBe('missing');
  });
});

describe('filling React controlled components', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const state: Record<string, unknown> = {};

  function Form() {
    const [first, setFirst] = useState('');
    const [bio, setBio] = useState('');
    const [country, setCountry] = useState('');
    const [relocate, setRelocate] = useState(false);
    const [auth, setAuth] = useState('');
    Object.assign(state, { first, bio, country, relocate, auth });
    return (
      <form>
        <label htmlFor="fn">First name</label>
        <input id="fn" value={first} onChange={(e) => setFirst(e.target.value)} />
        <label htmlFor="sk">Skills</label>
        <textarea id="sk" value={bio} onChange={(e) => setBio(e.target.value)} />
        <label htmlFor="co">Country</label>
        <select id="co" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">Select</option>
          <option value="IN">India</option>
          <option value="US">United States</option>
        </select>
        <label>
          <input type="checkbox" checked={relocate} onChange={(e) => setRelocate(e.target.checked)} /> Willing to relocate
        </label>
        <fieldset>
          <legend>Are you legally authorized to work here?</legend>
          <label>
            <input type="radio" name="auth" value="yes" checked={auth === 'yes'} onChange={() => setAuth('yes')} /> Yes
          </label>
          <label>
            <input type="radio" name="auth" value="no" checked={auth === 'no'} onChange={() => setAuth('no')} /> No
          </label>
        </fieldset>
      </form>
    );
  }

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('updates React state for input, textarea, select, checkbox and radio', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<Form />));

    let results: Awaited<ReturnType<typeof fillAll>> = [];
    await act(async () => {
      results = await fillAll();
    });

    expect(results.map((r) => r.status)).toEqual(['filled', 'filled', 'filled', 'filled', 'filled']);
    expect(state).toEqual({ first: 'Asha', bio: 'Kotlin, Flutter', country: 'IN', relocate: true, auth: 'yes' });
    // React re-rendered with the new state, so the DOM reflects it.
    expect(container.querySelector<HTMLInputElement>('#fn')!.value).toBe('Asha');
  });

  it('a naive element.value assignment would not update React state', () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<Form />));
    const input = container.querySelector<HTMLInputElement>('#fn')!;
    act(() => {
      input.value = 'Asha';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // Documents why the native setter is needed.
    expect(state.first).toBe('');
  });
});
