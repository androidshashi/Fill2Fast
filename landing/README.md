# Fill2Fast landing page

Marketing site for the Fill2Fast Chrome extension. Next.js (App Router) + TypeScript + Tailwind CSS. It is independent from the extension at the repo root and has its own dependencies.

```bash
cd landing
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm start       # serve the production build
npm run lint
```

## Configuration

All URLs live in [`lib/site.ts`](lib/site.ts):

- `CHROME_STORE_URL`: the [Chrome Web Store listing](https://chromewebstore.google.com/detail/fill2fast/ifgdombmnmbenmmecbbfolnhnmccflfd). Every "Add to Chrome" button uses it.
- `GITHUB_URL`, `GITHUB_ISSUES_URL`
- `SITE_URL`: comes from `NEXT_PUBLIC_SITE_URL` at build time and is used for absolute Open Graph URLs.

## Structure

```text
app/
  layout.tsx            Metadata, header, footer
  page.tsx              Home page sections
  privacy/page.tsx      Privacy policy (keep in sync with the extension's behaviour)
  icon.svg              Favicon
  opengraph-image.tsx   Generated 1200×630 social image
components/
  ui.tsx                Logo, buttons, icons, layout helpers
  site-chrome.tsx       Header and footer
  hero-demo.tsx         Static form + popup mockup
lib/site.ts             URLs and site constants
```
