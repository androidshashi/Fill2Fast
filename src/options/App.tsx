import { useEffect, useMemo, useState } from 'react';
import { computeCompletion } from '../core/completion';
import { MAX_AUTO_SELECT_THRESHOLD, MIN_AUTO_SELECT_THRESHOLD } from '../core/constants';
import { createEmptyProfile, DEFAULT_SETTINGS } from '../core/profile-defaults';
import { normalizeProfile, validateProfile, type ValidationErrors } from '../core/validation';
import { CompletionBar } from '../shared/CompletionBar';
import { clearProfile, getProfile, getResumeMeta, getSettings, saveProfile, saveSettings } from '../storage/profile-store';
import type { EmploymentType, Profile, RemotePreference, ResumeMeta, Settings } from '../types/profile';
import { ResumeSection } from './components/ResumeSection';
import { Section, SelectField, TagInput, TextField, YesNoField } from './components/fields';

type SectionKey = Exclude<keyof Profile, 'version' | 'updatedAt'>;

const REMOTE_OPTIONS: Array<{ value: RemotePreference; label: string }> = [
  { value: '', label: 'Not set' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
  { value: 'flexible', label: 'Flexible' },
];

const EMPLOYMENT_OPTIONS: Array<{ value: EmploymentType; label: string }> = [
  { value: '', label: 'Not set' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'freelance', label: 'Freelance' },
];

const NAV = [
  ['personal', 'Personal'],
  ['professional', 'Professional'],
  ['skills', 'Skills'],
  ['links', 'Links'],
  ['education', 'Education'],
  ['preferences', 'Preferences'],
  ['answers', 'Answers'],
  ['resume', 'Resume'],
  ['autofill', 'Autofill'],
] as const;

type SaveState = 'idle' | 'saving' | 'saved' | 'invalid';

export function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [resume, setResume] = useState<ResumeMeta | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  useEffect(() => {
    void Promise.all([getProfile(), getSettings(), getResumeMeta()]).then(([p, s, r]) => {
      setProfile(p);
      setSettings(s);
      setResume(r);
    });
  }, []);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const completion = useMemo(() => (profile ? computeCompletion(profile, resume) : null), [profile, resume]);

  if (!profile || !completion) return <div className="loading">Loading…</div>;

  function update<S extends SectionKey>(section: S, key: keyof Profile[S], value: Profile[S][keyof Profile[S]]) {
    setProfile((prev) => (prev ? { ...prev, [section]: { ...prev[section], [key]: value } } : prev));
    setDirty(true);
    setSaveState('idle');
    const errorKey = `${section}.${String(key)}`;
    if (errors[errorKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  }

  const text = <S extends SectionKey>(section: S, key: keyof Profile[S] & string) => ({
    value: profile[section][key] as string,
    onChange: (v: string) => update(section, key, v as Profile[S][keyof Profile[S]]),
    error: errors[`${section}.${key}`],
  });

  async function save() {
    if (!profile) return;
    const found = validateProfile(profile);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setSaveState('invalid');
      document.querySelector('.has-error input')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    setSaveState('saving');
    const [saved, savedSettings] = await Promise.all([saveProfile(normalizeProfile(profile)), saveSettings(settings)]);
    setProfile(saved);
    setSettings(savedSettings);
    setDirty(false);
    setSaveState('saved');
  }

  async function clearAll() {
    if (!window.confirm('Delete your Fill2Fast profile and stored resume from this browser? This cannot be undone.')) return;
    await clearProfile();
    setProfile(createEmptyProfile());
    setResume(null);
    setErrors({});
    setDirty(false);
    setSaveState('idle');
  }

  const saveLabel = { idle: dirty ? 'Save profile' : 'Saved', saving: 'Saving…', saved: 'Saved ✓', invalid: 'Save profile' }[saveState];

  return (
    <div className="options">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <img src="../icons/icon-48.png" alt="" width={28} height={28} />
            <div>
              <h1>Fill2Fast</h1>
              <span className="hint">Your profile stays in this browser. Nothing is uploaded.</span>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="topbar-completion">
              <CompletionBar completion={completion} />
            </div>
            <button className="btn btn-primary" onClick={() => void save()} disabled={saveState === 'saving' || (!dirty && saveState !== 'invalid')}>
              {saveLabel}
            </button>
          </div>
        </div>
        {saveState === 'invalid' && <div className="topbar-error">Some fields need attention before saving.</div>}
      </header>

      <div className="layout">
        <nav className="nav" aria-label="Sections">
          {NAV.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>

        <main
          className="content"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
              e.preventDefault();
              void save();
            }
          }}
        >
          <Section id="personal" title="Personal Information">
            <TextField label="First name" {...text('personal', 'firstName')} autoComplete="given-name" />
            <TextField label="Last name" {...text('personal', 'lastName')} autoComplete="family-name" />
            <TextField label="Full name" {...text('personal', 'fullName')} hint="Leave empty to use first + last name" wide />
            <TextField label="Email" type="email" {...text('personal', 'email')} autoComplete="email" />
            <TextField label="Phone" type="tel" {...text('personal', 'phone')} placeholder="+91 98765 43210" autoComplete="tel" />
            <TextField label="City" {...text('personal', 'city')} />
            <TextField label="State" {...text('personal', 'state')} />
            <TextField label="Country" {...text('personal', 'country')} placeholder="India" />
            <TextField label="Postal code" {...text('personal', 'pincode')} />
          </Section>

          <Section id="professional" title="Professional Information">
            <TextField label="Current company" {...text('professional', 'currentCompany')} />
            <TextField label="Current title" {...text('professional', 'currentTitle')} placeholder="Senior Android Engineer" />
            <TextField label="Total experience (years)" inputMode="decimal" {...text('professional', 'totalExperience')} placeholder="5" />
            <TextField
              label="Relevant experience (years)"
              inputMode="decimal"
              {...text('professional', 'relevantExperience')}
              hint="Uses total experience if empty"
            />
            <TextField label="Notice period" {...text('professional', 'noticePeriod')} placeholder="30 days" />
            <TextField label="Availability" {...text('professional', 'availability')} placeholder="Immediately" />
          </Section>

          <Section id="skills" title="Skills" description="Filled into “Skills” fields as a comma-separated list, primary skills first.">
            <TagInput
              label="Primary skills"
              values={profile.skills.primarySkills}
              onChange={(v) => update('skills', 'primarySkills', v)}
              placeholder="Flutter, Dart, Kotlin, Android…"
              hint="Press Enter or comma to add"
            />
            <TagInput
              label="Secondary skills"
              values={profile.skills.secondarySkills}
              onChange={(v) => update('skills', 'secondarySkills', v)}
              placeholder="Firebase, REST API, Git, CI/CD…"
            />
          </Section>

          <Section id="links" title="Links">
            <TextField label="LinkedIn" type="url" {...text('links', 'linkedin')} placeholder="linkedin.com/in/you" />
            <TextField label="GitHub" type="url" {...text('links', 'github')} placeholder="github.com/you" />
            <TextField label="Portfolio / website" type="url" {...text('links', 'portfolio')} />
            <TextField label="Twitter / X" type="url" {...text('links', 'twitter')} />
            <TextField label="LeetCode" type="url" {...text('links', 'leetcode')} />
          </Section>

          <Section id="education" title="Education">
            <TextField label="Degree" {...text('education', 'degree')} placeholder="B.Tech in Computer Science" />
            <TextField label="University" {...text('education', 'university')} />
            <TextField label="Graduation year" inputMode="numeric" {...text('education', 'graduationYear')} placeholder="2019" />
          </Section>

          <Section id="preferences" title="Job Preferences">
            <TextField label="Preferred role" {...text('preferences', 'preferredRole')} />
            <TextField label="Preferred location" {...text('preferences', 'preferredLocation')} />
            <SelectField
              label="Remote preference"
              value={profile.preferences.remotePreference}
              options={REMOTE_OPTIONS}
              onChange={(v) => update('preferences', 'remotePreference', v)}
            />
            <SelectField
              label="Employment type"
              value={profile.preferences.employmentType}
              options={EMPLOYMENT_OPTIONS}
              onChange={(v) => update('preferences', 'employmentType', v)}
            />
          </Section>

          <Section
            id="answers"
            title="Common Application Answers"
            description="Used for yes/no questions. Fill2Fast only answers when the question and the Yes/No options are clear."
          >
            <YesNoField
              label="Are you legally authorized to work in the country you are applying in?"
              value={profile.answers.workAuthorization}
              onChange={(v) => update('answers', 'workAuthorization', v)}
            />
            <YesNoField
              label="Will you require visa sponsorship?"
              value={profile.answers.requiresSponsorship}
              onChange={(v) => update('answers', 'requiresSponsorship', v)}
            />
            <YesNoField
              label="Are you willing to relocate?"
              value={profile.answers.willingToRelocate}
              onChange={(v) => update('answers', 'willingToRelocate', v)}
            />
          </Section>

          <ResumeSection resume={resume} onChange={setResume} />

          <Section
            id="autofill"
            title="Autofill"
            description="Salary fields are detected but never filled unless you allow it here."
          >
            <TextField label="Expected salary" {...text('compensation', 'expectedSalary')} placeholder="e.g. 30 LPA" />
            <TextField label="Current salary" {...text('compensation', 'currentSalary')} />
            <label className="toggle wide">
              <input
                type="checkbox"
                checked={profile.compensation.allowAutofill}
                onChange={(e) => update('compensation', 'allowAutofill', e.target.checked)}
              />
              <span>Allow Fill2Fast to fill salary fields</span>
            </label>
            <div className="field wide">
              <label htmlFor="threshold">
                Pre-select matches with confidence of at least <strong>{settings.autoSelectThreshold}%</strong>
              </label>
              <input
                id="threshold"
                type="range"
                min={MIN_AUTO_SELECT_THRESHOLD}
                max={MAX_AUTO_SELECT_THRESHOLD}
                step={5}
                value={settings.autoSelectThreshold}
                onChange={(e) => {
                  setSettings({ autoSelectThreshold: Number(e.target.value) });
                  setDirty(true);
                  setSaveState('idle');
                }}
              />
              <span className="hint">Lower-confidence matches are still shown in the popup, just not selected.</span>
            </div>
          </Section>

          <section className="section danger">
            <header>
              <h2>Your data</h2>
              <p>Fill2Fast never sends your profile anywhere. You can delete everything it stores at any time.</p>
            </header>
            <button className="btn btn-danger" onClick={() => void clearAll()}>
              Delete profile and resume
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}
