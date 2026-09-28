/**
 * Site-wide constants. Update these in one place.
 */

/**
 * Chrome Web Store listing. Replace "#" with the real listing URL once the
 * extension is published. Every "Add to Chrome" button reads this constant.
 */
export const CHROME_STORE_URL = "#";

export const GITHUB_URL = "https://github.com/androidshashi/Fill2Fast";
export const GITHUB_ISSUES_URL = "https://github.com/androidshashi/Fill2Fast/issues";

/**
 * Public URL of this website, used for absolute Open Graph URLs.
 * Set NEXT_PUBLIC_SITE_URL at build time once the domain is known.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const SITE_NAME = "Fill2Fast";
export const SITE_TITLE = "Fill2Fast — Fill Job Applications Faster";
export const SITE_DESCRIPTION =
  "Fill job applications faster with Fill2Fast, a free Chrome extension that saves your profile and fills common application fields.";

/** True once CHROME_STORE_URL points at a real listing. */
export const isChromeStoreLive = CHROME_STORE_URL !== "#";
