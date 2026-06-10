// SnipKit - service-worker.js

// (A-016) Single source of truth: import seed from shared module
// No longer duplicating the seed array inline
import { seedDefaultSnippets } from '../shared/storage.js';

// ============================================================
// ON INSTALLED — seed default snippets once
// ============================================================
chrome.runtime.onInstalled.addListener(async function () {
  try {
    await seedDefaultSnippets();
    console.log('[SnipKit] Extension installed and ready.');
  } catch (err) {
    console.error('[SnipKit] Failed to seed data on install:', err);
  }
});

// ============================================================
// COMMAND PALETTE — relay shortcut to content script (A-007)
// ============================================================
chrome.commands.onCommand.addListener(function (command) {
  if (command !== 'open-palette') return;

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tab = tabs?.[0];
    if (!tab?.url) return;

    // (A-007) Skip privileged URLs where content scripts cannot be injected.
    // Without this guard, sendMessage throws on chrome:// tabs and the
    // shortcut appears broken to the user with no feedback.
    const url = tab.url;
    if (
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('devtools://') ||
      url.startsWith('edge://') ||
      url.startsWith('about:')
    ) {
      console.debug('[SnipKit] Shortcut blocked on privileged page:', url);
      return;
    }

    chrome.tabs.sendMessage(
      tab.id,
      { action: 'toggle-palette' },
      function () {
        // Consume lastError to suppress "Receiving end does not exist"
        // (fires when the tab hasn't loaded the content script yet,
        // e.g. a tab that was open before the extension was installed).
        if (chrome.runtime.lastError) {
          console.debug('[SnipKit] Tab not ready for palette:', chrome.runtime.lastError.message);
        }
      }
    );
  });
});
