import Link from "next/link";
import { GITHUB_URL } from "@/lib/site";
import { ChromeButton, Container, GitHubIcon, Logo, LogoMark } from "./ui";

const navLink = "rounded-md px-2 py-1 text-sm font-medium text-muted transition-colors hover:text-ink";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-white/85 backdrop-blur">
      <a
        href="#main"
        className="sr-only rounded-md bg-ink px-3 py-2 text-sm text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-3"
      >
        Skip to content
      </a>
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-3">
          <a href={GITHUB_URL} className={`${navLink} inline-flex items-center`} aria-label="GitHub">
            <GitHubIcon className="size-5 sm:hidden" />
            <span className="hidden sm:inline" aria-hidden="true">
              GitHub
            </span>
          </a>
          <Link href="/privacy" className={`${navLink} hidden sm:inline-block`}>
            Privacy
          </Link>
          <ChromeButton label="Add to Chrome" size="sm" />
        </nav>
      </Container>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <Container className="flex flex-col gap-8 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <LogoMark className="size-6" />
            Fill2Fast
          </p>
          <p className="mt-3 text-sm text-muted">Free Chrome extension for faster job applications.</p>
        </div>
        <nav aria-label="Footer" className="flex gap-6 text-sm">
          <a href={GITHUB_URL} className="text-muted hover:text-ink">
            GitHub
          </a>
          <Link href="/privacy" className="text-muted hover:text-ink">
            Privacy
          </Link>
        </nav>
      </Container>
      <Container className="pb-10">
        <p className="text-xs text-muted">© 2026 Encotic Labs</p>
      </Container>
    </footer>
  );
}
