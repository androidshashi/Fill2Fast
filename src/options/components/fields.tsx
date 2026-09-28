import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { YesNo } from '../../types/profile';

export function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="section" id={id} aria-labelledby={`${id}-title`}>
      <header>
        <h2 id={`${id}-title`}>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      <div className="grid">{children}</div>
    </section>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel' | 'url';
  inputMode?: 'text' | 'decimal' | 'numeric' | 'email' | 'tel' | 'url';
  autoComplete?: string;
  wide?: boolean;
}

export function TextField({ label, value, onChange, error, hint, placeholder, type = 'text', inputMode, autoComplete = 'off', wide }: TextFieldProps) {
  const id = useId();
  return (
    <div className={`field ${wide ? 'wide' : ''} ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${id}-help` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {(error || hint) && (
        <span id={`${id}-help`} className={error ? 'error' : 'hint'}>
          {error ?? hint}
        </span>
      )}
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

export function SelectField<T extends string>({ label, value, options, onChange }: SelectFieldProps<T>) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function YesNoField({ label, value, onChange }: { label: string; value: YesNo; onChange: (value: YesNo) => void }) {
  const choices: Array<{ value: YesNo; label: string }> = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
    { value: '', label: 'Not set' },
  ];
  return (
    <fieldset className="field wide yes-no">
      <legend>{label}</legend>
      <div className="segmented" role="radiogroup">
        {choices.map((c) => (
          <button
            type="button"
            key={c.value || 'unset'}
            role="radio"
            aria-checked={value === c.value}
            className={value === c.value ? 'active' : ''}
            onClick={() => onChange(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Chip-style list input: type a skill and press Enter or comma. */
export function TagInput({ label, values, onChange, placeholder, hint }: { label: string; values: string[]; onChange: (values: string[]) => void; placeholder?: string; hint?: string }) {
  const id = useId();
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const items = raw
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const lower = new Set(values.map((v) => v.toLowerCase()));
    const next = [...values];
    for (const item of items) {
      if (!lower.has(item.toLowerCase())) {
        next.push(item);
        lower.add(item.toLowerCase());
      }
    }
    if (next.length !== values.length) onChange(next);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="field wide">
      <label htmlFor={id}>{label}</label>
      <div className="tags" onClick={() => document.getElementById(id)?.focus()}>
        {values.map((value) => (
          <span className="tag" key={value}>
            {value}
            <button type="button" aria-label={`Remove ${value}`} onClick={() => onChange(values.filter((v) => v !== value))}>
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          placeholder={values.length === 0 ? placeholder : ''}
          onChange={(e) => (e.target.value.includes(',') ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && add(draft)}
        />
      </div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}
