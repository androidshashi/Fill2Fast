const FIELDS = [
  { label: "First name", value: "Shashi", short: "First name" },
  { label: "Last name", value: "Kumar", short: "Last name" },
  { label: "Email", value: "shashi@example.com", short: "Email" },
  { label: "Phone", value: "+91 98765 43210", short: "Phone" },
  { label: "LinkedIn", value: "linkedin.com/in/shashi", short: "LinkedIn" },
  { label: "Years of experience", value: "6", short: "Experience" },
];

const STEPS = ["Detect", "Review", "Fill"];

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Static illustration of a job application form being filled by the
 * Fill2Fast popup. Purely decorative markup, exposed to assistive tech as a
 * single image with a text description.
 */
export function HeroDemo() {
  return (
    <figure className="relative mx-auto w-full max-w-xl">
      <div
        role="img"
        aria-label="Illustration: a job application form with six fields. The Fill2Fast popup has detected all six fields — first name, last name, email, phone, LinkedIn and experience — and offers a Fill selected button."
        className="relative pb-52 sm:pb-0 sm:pr-24"
      >
        {/* Job application form */}
        <div className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(20,20,40,0.04),0_12px_32px_-12px_rgba(20,20,40,0.12)]">
          <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
            <span className="size-2.5 rounded-full bg-line" />
            <span className="size-2.5 rounded-full bg-line" />
            <span className="size-2.5 rounded-full bg-line" />
            <span className="ml-3 truncate rounded-md bg-surface px-2.5 py-1 font-mono text-[11px] text-muted">
              careers.example.com/apply
            </span>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-base font-semibold text-ink">Job Application</p>
            <p className="mt-0.5 text-xs text-muted">Senior Android Engineer</p>
            <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-3.5">
              {FIELDS.map((f, i) => (
                <div key={f.label} className={i >= 2 ? "col-span-2 sm:col-span-1" : ""}>
                  <p className="text-[11px] font-medium text-muted">{f.label}</p>
                  <p className="mt-1 truncate rounded-md border border-accent/30 bg-accent-soft/60 px-2.5 py-1.5 text-[13px] text-ink">
                    {f.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fill2Fast popup */}
        <div className="absolute bottom-0 right-3 w-60 rounded-xl border border-line bg-white shadow-[0_2px_4px_rgba(20,20,40,0.06),0_20px_40px_-12px_rgba(20,20,40,0.25)] sm:-bottom-8 sm:right-0">
          <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
            <svg viewBox="0 0 100 100" className="size-5">
              <rect width="100" height="100" rx="22" fill="#4f46e5" />
              <path d="M58 12 26 56h21l-7 32 34-46H53l7-30z" fill="#fff" />
            </svg>
            <span className="text-sm font-semibold text-ink">Fill2Fast</span>
            <span className="ml-auto rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
              6 fields detected
            </span>
          </div>
          <ul className="space-y-1.5 px-3.5 py-3">
            {FIELDS.map((f) => (
              <li key={f.short} className="flex items-center gap-2 text-[13px] text-ink">
                <span className="grid size-4 place-items-center rounded bg-accent text-white">
                  <Check />
                </span>
                {f.short}
              </li>
            ))}
          </ul>
          <div className="px-3.5 pb-3.5">
            <span className="block rounded-md bg-accent py-2 text-center text-[13px] font-medium text-white">
              Fill selected
            </span>
          </div>
        </div>
      </div>

      <figcaption className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-muted sm:mt-16">
        {STEPS.map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true">→</span>}
            <span className={i === STEPS.length - 1 ? "text-accent" : ""}>{s}</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
