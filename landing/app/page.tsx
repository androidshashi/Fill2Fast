import type { ReactNode } from "react";
import { HeroDemo } from "@/components/hero-demo";
import { ButtonLink, ChromeButton, Container, Eyebrow, GitHubIcon } from "@/components/ui";
import { GITHUB_ISSUES_URL, GITHUB_URL } from "@/lib/site";

const STEPS = [
  { n: "01", title: "Save your profile", body: "Enter your information once.", icon: <UserIcon /> },
  {
    n: "02",
    title: "Open a job application",
    body: "Fill2Fast detects common form fields.",
    icon: <SearchIcon />,
  },
  {
    n: "03",
    title: "Review and fill",
    body: "Select the fields you want to fill and do it with one click.",
    icon: <BoltIcon />,
  },
];

const FEATURES = [
  {
    title: "Smart field detection",
    body: "Recognizes common job application fields using page metadata and labels.",
    icon: <SearchIcon />,
  },
  { title: "One-click filling", body: "Review detected fields and fill them together.", icon: <BoltIcon /> },
  { title: "Local-first", body: "Profile information is stored locally in the browser.", icon: <LockIcon /> },
  {
    title: "Built for job seekers",
    body: "Supports common professional, developer, education, and application fields.",
    icon: <BriefcaseIcon />,
  },
];

const SUPPORTED = [
  { group: "Personal", items: ["Name", "Email", "Phone", "Location"] },
  { group: "Professional", items: ["Current company", "Current role", "Experience", "Notice period"] },
  { group: "Developer", items: ["Skills", "GitHub", "LinkedIn", "Portfolio"] },
  { group: "Application", items: ["Education", "Work authorization", "Relocation", "Other common fields"] },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden">
        <Container className="grid items-center gap-14 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:pb-28 lg:pt-24">
          <div className="max-w-xl">
            <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
              Fill job applications faster.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted sm:text-xl">
              Save your information once. Fill common job application fields with one click.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ChromeButton />
              <ButtonLink href={GITHUB_URL} variant="secondary">
                <GitHubIcon />
                View on GitHub
              </ButtonLink>
            </div>
            <ul className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <li>No account</li>
              <li aria-hidden="true">•</li>
              <li>No subscription</li>
              <li aria-hidden="true">•</li>
              <li>Local-first</li>
            </ul>
          </div>
          <HeroDemo />
        </Container>
      </section>

      {/* Problem */}
      <section className="border-y border-line bg-surface">
        <Container className="py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Stop typing the same information into every job application.
            </h2>
            <p className="mt-6 font-mono text-sm text-muted sm:text-base">
              Name. Email. Phone. Experience. Skills. LinkedIn. GitHub. Education.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Fill2Fast saves the repetitive work so you can spend your time on the application itself.
            </p>
          </div>
        </Container>
      </section>

      {/* How it works */}
      <Section id="how-it-works" eyebrow="How it works" title="Three steps. Then just review and fill.">
        <ol className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-2xl border border-line bg-white p-6">
              <div className="flex items-center justify-between">
                <IconBadge>{s.icon}</IconBadge>
                <span className="font-mono text-sm text-muted">{s.n}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Features */}
      <Section id="features" eyebrow="Features" title="Small, focused, and out of your way." className="pt-0 sm:pt-0">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-line bg-white p-6">
              <IconBadge>{f.icon}</IconBadge>
              <h3 className="mt-5 font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Supported information */}
      <Section
        id="supported"
        eyebrow="Supported information"
        title="The fields you fill again and again."
        className="pt-0 sm:pt-0"
      >
        <div className="grid overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4 [&>*]:bg-white gap-px">
          {SUPPORTED.map((g) => (
            <div key={g.group} className="p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink">{g.group}</h3>
              <ul className="mt-4 space-y-2.5">
                {g.items.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-muted">
                    <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Privacy */}
      <section className="border-y border-line bg-surface">
        <Container className="grid gap-10 py-20 sm:py-24 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <Eyebrow>Privacy</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Your job application data stays with you.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Fill2Fast is designed as a local-first Chrome extension. Your profile is stored in your browser and the
              product does not require an account or a backend for basic autofill.
            </p>
            <div className="mt-8">
              <ButtonLink href="/privacy" variant="secondary">
                Read Privacy Policy
              </ButtonLink>
            </div>
          </div>
          <ul className="space-y-3">
            {[
              "Profile saved in your browser’s local extension storage",
              "No account, no sign-in",
              "No analytics or tracking in the extension",
              "Nothing is filled until you click Fill selected",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 rounded-xl border border-line bg-white px-4 py-3.5 text-ink">
                <span className="mt-0.5 text-accent">
                  <CheckIcon />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* GitHub */}
      <Section id="open-source" eyebrow="GitHub" title="Built in the open.">
        <div className="flex flex-col gap-8 rounded-2xl border border-line p-8 sm:p-10 md:flex-row md:items-center md:justify-between">
          <p className="max-w-xl text-lg leading-relaxed text-muted">
            Fill2Fast is developed openly on GitHub. Explore the code, report issues, and suggest improvements.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={GITHUB_URL} variant="secondary">
              <GitHubIcon />
              View GitHub
            </ButtonLink>
            <ButtonLink href={GITHUB_ISSUES_URL} variant="secondary">
              Report an Issue
            </ButtonLink>
          </div>
        </div>
      </Section>

      {/* Final CTA */}
      <section className="pb-24">
        <Container>
          <div className="rounded-3xl bg-ink px-6 py-16 text-center sm:px-12 sm:py-20">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">Apply faster.</h2>
            <p className="mx-auto mt-4 max-w-md text-lg text-zinc-300">
              Save your profile once and stop retyping the same information.
            </p>
            <div className="mt-8 flex justify-center">
              <ChromeButton />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
  className = "",
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`py-20 sm:py-24 ${className}`}>
      <Container>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 id={`${id}-title`} className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {title}
        </h2>
        <div className="mt-10">{children}</div>
      </Container>
    </section>
  );
}

function IconBadge({ children }: { children: ReactNode }) {
  return <span className="grid size-10 place-items-center rounded-lg bg-accent-soft text-accent">{children}</span>;
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function UserIcon() {
  return (
    <Svg>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Svg>
  );
}

function SearchIcon() {
  return (
    <Svg>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Svg>
  );
}

function BoltIcon() {
  return (
    <Svg>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </Svg>
  );
}

function LockIcon() {
  return (
    <Svg>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  );
}

function BriefcaseIcon() {
  return (
    <Svg>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}
