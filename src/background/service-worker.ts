/**
 * Background service worker. Deliberately tiny: Fill2Fast has no backend and
 * makes no network requests. It only opens the profile editor on first install.
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    void chrome.runtime.openOptionsPage();
  }
});
