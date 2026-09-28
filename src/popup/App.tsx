import { useEffect, useMemo, useState } from 'react';
import { computeCompletion, type Completion } from '../core/completion';
import { FieldType } from '../core/field-types';
import { groupField, isSelectable } from '../core/selection';
import { CompletionBar } from '../shared/CompletionBar';
import { getProfile, getResumeMeta, getSettings, hasProfile } from '../storage/profile-store';
import { FieldRow } from './components/FieldRow';
import { requestOriginAccess } from './page-bridge';
import { usePageFields, type PopupField } from './usePageFields';

interface ProfileStatus {
  configured: boolean;
  completion: Completion;
  threshold: number;
}

function openOptions() {
  void chrome.runtime.openOptionsPage();
  window.close();
}

export function App() {
  const [profile, setProfile] = useState<ProfileStatus | null>(null);

  useEffect(() => {
    void (async () => {
      const [configured, p, resume, settings] = await Promise.all([hasProfile(), getProfile(), getResumeMeta(), getSettings()]);
      setProfile({ configured, completion: computeCompletion(p, resume), threshold: settings.autoSelectThreshold });
    })();
  }, []);

  const page = usePageFields(profile?.threshold ?? null);
  const threshold = profile?.threshold ?? 100;

  const groups = useMemo(() => {
    const ready: PopupField[] = [];
    const review: PopupField[] = [];
    const unknown: PopupField[] = [];
    for (const field of page.fields) {
      const group = groupField(field, threshold);
      (group === 'ready' ? ready : group === 'review' ? review : unknown).push(field);
    }
    return { ready, review, unknown };
  }, [page.fields, threshold]);

  const matched = page.fields.filter((f) => f.fieldType !== FieldType.UNKNOWN).length;
  const selectedCount = page.fields.filter((f) => isSelectable(f) && page.selected[f.key]).length;
  const resultList = Object.values(page.results);
  const filledCount = resultList.filter((r) => r.status === 'filled').length;
  const failedCount = resultList.filter((r) => r.status === 'failed').length;

  const renderRows = (fields: PopupField[]) => (
    <ul className="field-list">
      {fields.map((field) => (
        <FieldRow
          key={field.key}
          field={field}
          selected={!!page.selected[field.key]}
          result={page.results[field.key]}
          onToggle={page.toggle}
          onReveal={page.reveal}
          onEditProfile={openOptions}
        />
      ))}
    </ul>
  );

  return (
    <div className="popup">
      <header className="popup-header">
        <div className="brand">
          <img src="../icons/icon-32.png" alt="" width={20} height={20} />
          <span>Fill2Fast</span>
        </div>
        <span className="local-badge" title="Your profile is stored only in this browser">Local only</span>
      </header>

      <section className="card">
        <div className="card-label">Profile</div>
        {profile === null ? (
          <div className="muted">Loading…</div>
        ) : profile.configured ? (
          <>
            <div className="status ok">✓ Profile configured</div>
            <CompletionBar completion={profile.completion} compact />
          </>
        ) : (
          <div className="setup">
            <div className="status warn">⚠ No profile yet</div>
            <button className="btn btn-primary" onClick={openOptions}>Set up profile</button>
          </div>
        )}
      </section>

      <section className="card page-card">
        <div className="card-label">Current page</div>
        {page.state.status === 'loading' && <div className="muted">Scanning for form fields…</div>}
        {page.state.status === 'unavailable' && (
          <div className="muted">Fill2Fast can’t run on this page. Open a job application to get started.</div>
        )}
        {page.state.status === 'error' && <div className="status error">Could not scan this page: {page.state.message}</div>}
        {page.state.status === 'ready' && (
          <>
            <div className="page-summary">
              <strong>{page.fields.length}</strong> field{page.fields.length === 1 ? '' : 's'} detected ·{' '}
              <strong>{matched}</strong> matched
            </div>

            {page.blockedOrigins.length > 0 && (
              <div className="banner">
                This form is embedded from <strong>{page.blockedOrigins.map((o) => new URL(o).hostname).join(', ')}</strong>.
                <button
                  className="btn-link"
                  onClick={async () => {
                    if (await requestOriginAccess(page.blockedOrigins)) void page.rescan();
                  }}
                >
                  Allow Fill2Fast on this form
                </button>
              </div>
            )}

            {resultList.length > 0 && (
              <div className={`status ${failedCount ? 'warn' : 'ok'}`}>
                ✓ {filledCount} filled{failedCount > 0 && ` · ✕ ${failedCount} could not be filled`}
              </div>
            )}

            {page.fields.length === 0 && <div className="muted">No fillable form fields found on this page.</div>}

            {groups.ready.length > 0 && renderRows(groups.ready)}

            {groups.review.length > 0 && (
              <>
                <div className="group-label">Review</div>
                {renderRows(groups.review)}
              </>
            )}

            {groups.unknown.length > 0 && (
              <details className="unknown">
                <summary>
                  {groups.unknown.length} unknown field{groups.unknown.length === 1 ? '' : 's'} (not filled)
                </summary>
                {renderRows(groups.unknown)}
              </details>
            )}
          </>
        )}
      </section>

      <footer className="popup-footer">
        <button
          className="btn btn-primary fill-btn"
          disabled={selectedCount === 0 || page.filling || page.state.status !== 'ready'}
          onClick={() => void page.fillSelected()}
        >
          {page.filling ? 'Filling…' : `Fill Selected${selectedCount ? ` (${selectedCount})` : ''}`}
        </button>
        <button className="btn" onClick={openOptions}>Edit Profile</button>
      </footer>
    </div>
  );
}
