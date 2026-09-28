import { useRef, useState, type ChangeEvent } from 'react';
import { arrayBufferToBase64 } from '../../core/base64';
import { MAX_RESUME_BYTES, RESUME_ACCEPT } from '../../core/constants';
import { clearResume, saveResume } from '../../storage/profile-store';
import type { ResumeMeta } from '../../types/profile';

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ResumeSection({ resume, onChange }: { resume: ResumeMeta | null; onChange: (meta: ResumeMeta | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_RESUME_BYTES) {
      setError(`That file is ${formatSize(file.size)}. Please use a file under ${formatSize(MAX_RESUME_BYTES)}.`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const data = arrayBufferToBase64(await file.arrayBuffer());
      onChange(await saveResume({ name: file.name, type: file.type, size: file.size, data }));
    } catch (err) {
      setError(`Could not save the resume: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    await clearResume();
    onChange(null);
  };

  return (
    <section className="section" id="resume" aria-labelledby="resume-title">
      <header>
        <h2 id="resume-title">Resume</h2>
        <p>
          Stored only in this browser. When a job application has a resume upload field, Fill2Fast can attach this file
          after you click “Fill Selected”. If a site does not accept it, Fill2Fast highlights the upload field so you can
          select the file yourself.
        </p>
      </header>
      <div className="resume">
        {resume ? (
          <div className="resume-file">
            <span className="resume-icon" aria-hidden>
              📄
            </span>
            <div>
              <div className="resume-name">{resume.name}</div>
              <div className="hint">
                {formatSize(resume.size)} · added {new Date(resume.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ) : (
          <div className="hint">No resume selected.</div>
        )}
        <div className="resume-actions">
          <input ref={input} type="file" accept={RESUME_ACCEPT} hidden onChange={onFile} />
          <button type="button" className="btn" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? 'Saving…' : resume ? 'Replace file' : 'Select resume file'}
          </button>
          {resume && (
            <button type="button" className="btn btn-danger" onClick={remove}>
              Remove
            </button>
          )}
        </div>
        {error && <div className="error">{error}</div>}
      </div>
    </section>
  );
}
