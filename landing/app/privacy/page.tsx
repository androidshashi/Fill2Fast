import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Container } from "@/components/ui";
import { GITHUB_ISSUES_URL, GITHUB_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How the Fill2Fast Chrome extension handles your data: what it stores, where, and how to delete it.",
  alternates: { canonical: "/privacy" },
  openGraph: { url: "/privacy" },
};

const LAST_UPDATED = "September 28, 2026";

const link = "font-medium text-accent underline underline-offset-2 hover:text-accent-hover";

export default function PrivacyPage() {
  return (
    <Container className="py-16 sm:py-20">
      <article className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Fill2Fast Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted">Last updated: {LAST_UPDATED}</p>

        <p className="mt-8 text-lg leading-relaxed text-muted">
          Fill2Fast is a Chrome extension that fills job application forms from a profile you save. It has no backend
          server and no user accounts. This policy describes what the extension does with your data.
        </p>

        <Block title="What Fill2Fast stores">
          <p>Only the information you enter yourself in the Fill2Fast profile editor:</p>
          <ul>
            <li>
              <strong>Profile:</strong> name, email, phone, location (city, state, country, postal code), current
              company and title, experience, notice period and availability, skills, links (LinkedIn, GitHub,
              portfolio, Twitter/X, LeetCode), education, job preferences, and answers to yes/no questions such as work
              authorization, sponsorship and relocation.
            </li>
            <li>
              <strong>Salary (optional):</strong> expected and current salary, if you enter them. These are only
              filled into a form if you explicitly turn on salary autofill.
            </li>
            <li>
              <strong>Resume (optional):</strong> one file you upload (PDF, DOC, DOCX, RTF, TXT or ODT, up to 4 MB),
              along with its name, type and size.
            </li>
            <li>
              <strong>Settings:</strong> the extension’s own preferences, such as which fields are pre-selected.
            </li>
          </ul>
        </Block>

        <Block title="Where the data is stored">
          <p>
            Everything is saved in <code>chrome.storage.local</code>, the extension’s local storage inside your Chrome
            profile on your device. It is not synced to your Google account by Fill2Fast and is not sent to any
            Fill2Fast server — there isn’t one.
          </p>
        </Block>

        <Block title="What data is accessed">
          <p>
            Fill2Fast only runs on a page when you click its toolbar icon. It uses Chrome’s <code>activeTab</code> and{" "}
            <code>scripting</code> permissions to look at the form on the current tab at that moment.
          </p>
          <ul>
            <li>
              To detect fields, it reads form controls and their labels, attributes (such as <code>name</code>,{" "}
              <code>autocomplete</code> and <code>placeholder</code>), nearby text, and whether a field already has a
              value.
            </li>
            <li>
              When you click <strong>Fill selected</strong>, it writes your saved values into the fields you selected,
              and attaches your stored resume to a file-upload field if you selected it.
            </li>
            <li>
              If an application form is embedded from another website (for example, a hosted form inside a company
              careers page), Fill2Fast asks for permission to access that one site. You can decline, and you can revoke
              granted sites at any time from Chrome’s extension settings.
            </li>
          </ul>
          <p>
            Information read from the page is used only to show you the detected fields and fill them. It is not
            saved.
          </p>
        </Block>

        <Block title="What is not collected">
          <ul>
            <li>No account or sign-in.</li>
            <li>No analytics, telemetry, crash reporting or tracking.</li>
            <li>No browsing history.</li>
            <li>
              No network requests. The extension makes no network calls, and its extension pages use a content security
              policy that blocks network connections (<code>connect-src &apos;none&apos;</code>).
            </li>
          </ul>
          <p>
            Your profile data leaves your device only when you fill it into a job application yourself. From that point,
            the website you’re applying on receives it as if you had typed it, under that website’s own privacy policy.
          </p>
        </Block>

        <Block title="Third-party services">
          <p>
            The Fill2Fast extension does not use any third-party services, SDKs or analytics. The extension is
            distributed through the Chrome Web Store, which is operated by Google under its own terms and privacy
            policy.
          </p>
          <p>This website does not use analytics, cookies or third-party scripts.</p>
        </Block>

        <Block title="How to delete your data">
          <ul>
            <li>
              Open the Fill2Fast profile editor and click <strong>Delete profile and resume</strong>. This removes your
              profile and resume from the extension’s storage. Your extension settings are kept.
            </li>
            <li>
              Removing the extension from Chrome deletes everything Fill2Fast has stored, including settings.
            </li>
          </ul>
        </Block>

        <Block title="Changes">
          <p>
            If the extension’s data practices change, this page will be updated and the “Last updated” date changed. The
            source code is public on{" "}
            <a href={GITHUB_URL} className={link}>
              GitHub
            </a>
            , so you can check what it does.
          </p>
        </Block>

        <Block title="Contact">
          <p>
            For questions about this policy or about Fill2Fast, please{" "}
            <a href={GITHUB_ISSUES_URL} className={link}>
              open an issue on GitHub
            </a>
            .
          </p>
        </Block>
      </article>
    </Container>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-muted [&_code]:rounded [&_code]:bg-surface [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.875em] [&_code]:text-ink [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
