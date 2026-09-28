import { confidenceLevel } from '../../core/confidence';
import { FIELD_TYPE_LABELS, FieldType } from '../../core/field-types';
import { isSelectable } from '../../core/selection';
import type { FieldFillResult } from '../../types/messages';
import type { PopupField } from '../usePageFields';

interface Props {
  field: PopupField;
  selected: boolean;
  result?: FieldFillResult;
  onToggle: (key: string) => void;
  onReveal: (field: PopupField) => void;
  onEditProfile: () => void;
}

function truncate(text: string, max = 48): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function Detail({ field, result, onReveal, onEditProfile }: Omit<Props, 'selected' | 'onToggle'>) {
  const isResume = field.fieldType === FieldType.RESUME;

  if (result?.status === 'filled' && field.suggestion.status === 'filled') {
    return <span className="detail ok">✓ Filled</span>;
  }
  if (result?.status === 'failed') {
    return (
      <span className="detail error">
        ✕ {isResume ? 'Could not attach resume' : 'Could not fill this field'}
        {isResume && (
          <>
            {' · '}
            <button className="btn-link" onClick={() => onReveal(field)}>Select resume file</button>
          </>
        )}
      </span>
    );
  }

  const { status, displayValue, message } = field.suggestion;
  switch (status) {
    case 'ready': {
      const replaces = field.currentValue.trim() && field.kind !== 'checkbox';
      return (
        <span className="detail">
          <span className="value">{truncate(displayValue ?? '')}</span>
          {replaces && <span className="muted"> · replaces “{truncate(field.currentValue, 24)}”</span>}
        </span>
      );
    }
    case 'filled':
      return <span className="detail ok">✓ Already filled</span>;
    case 'missing':
      return (
        <span className="detail warn">
          ⚠ Not configured ·{' '}
          <button className="btn-link" onClick={onEditProfile}>Add to profile</button>
        </span>
      );
    case 'blocked':
      return <span className="detail muted">🔒 {message}</span>;
    case 'no-option':
    case 'ambiguous':
      return <span className="detail warn">⚠ {message}</span>;
    default:
      return <span className="detail muted">{truncate(field.label, 60)}</span>;
  }
}

export function FieldRow({ field, selected, result, onToggle, onReveal, onEditProfile }: Props) {
  const selectable = isSelectable(field);
  const known = field.fieldType !== FieldType.UNKNOWN;
  const level = confidenceLevel(field.confidence);
  const title = known ? FIELD_TYPE_LABELS[field.fieldType] : 'Unknown field';

  return (
    <li className={`field-row ${selectable ? '' : 'disabled'}`}>
      <input
        type="checkbox"
        aria-label={`Fill ${title}`}
        checked={selectable && selected}
        disabled={!selectable}
        onChange={() => onToggle(field.key)}
      />
      <div className="field-main">
        <div className="field-title">
          <button className="field-name" title={`Show on page — “${field.label}”`} onClick={() => onReveal(field)}>
            {title}
          </button>
          {known && (
            <span className={`confidence ${level}`} title={`Match confidence: ${field.confidence}%`}>
              {field.confidence}%
            </span>
          )}
        </div>
        <Detail field={field} result={result} onReveal={onReveal} onEditProfile={onEditProfile} />
      </div>
    </li>
  );
}
