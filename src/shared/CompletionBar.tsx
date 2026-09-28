import type { Completion } from '../core/completion';

export function CompletionBar({ completion, compact = false }: { completion: Completion; compact?: boolean }) {
  return (
    <div className="completion">
      <div className="completion-head">
        <span>Profile completion</span>
        <strong>{completion.percent}%</strong>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-valuenow={completion.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completion"
      >
        <span style={{ width: `${completion.percent}%` }} />
      </div>
      {!compact && (
        <div className="completion-foot">
          {completion.completed} / {completion.total} important fields completed
        </div>
      )}
    </div>
  );
}
