// SnipKit - service-worker.js

chrome.runtime.onInstalled.addListener(function () {
  const seed = [
    {
      id: '1',
      trigger: '\\usn',
      expansion: '1DS22CS094 \u2014 Samprati Gaurav, Dayananda Sagar University',
      category: 'work',
      usageCount: 0,
      createdAt: Date.now()
    },
    {
      id: '2',
      trigger: '\\stack',
      expansion: 'React \u00b7 TypeScript \u00b7 Node.js \u00b7 Socket.io \u00b7 PostgreSQL \u00b7 Tailwind CSS \u00b7 Vite',
      category: 'hackathon',
      usageCount: 0,
      createdAt: Date.now()
    },
    {
      id: '3',
      trigger: '\\intro',
      expansion: "Hi, I'm Sam \u2014 a 2nd-year CS (Cyber Security) student at DSU. I build and ship web apps independently.",
      category: 'work',
      usageCount: 0,
      createdAt: Date.now()
    },
    {
      id: '4',
      trigger: '\\repo',
      expansion: 'https://github.com/samprati-gaurav \u2014 SyncWatch, Duet, SnipKit',
      category: 'github',
      usageCount: 0,
      createdAt: Date.now()
    },
    {
      id: '5',
      trigger: '\\pr',
      expansion: '## Summary\n**What**: \n**Why**: \n**Testing**: ',
      category: 'github',
      usageCount: 0,
      createdAt: Date.now()
    }
  ];

  chrome.storage.local.set({ snipkit_snippets: seed }).then(() => {
    console.debug('[SnipKit] Seed data written:', seed.length, 'snippets.');
    console.log('[SnipKit] Extension installed and ready.');
  }).catch(err => {
    console.error('[SnipKit] Failed to write seed data:', err);
  });
});

// ============================================================
// COMMAND PALETTE — relay shortcut to content script
// ============================================================
chrome.commands.onCommand.addListener(function (command) {
  if (command === 'open-palette') {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs[0]) return;
      try {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'toggle-palette' },
          function (response) {
            // Consume lastError to suppress "Receiving end does not exist"
            // which fires when the tab hasn't loaded the content script yet
            // (e.g. chrome:// pages or tabs opened before the extension loaded).
            if (chrome.runtime.lastError) {
              console.debug('[SnipKit] Tab not ready for palette:', chrome.runtime.lastError.message);
            }
          }
        );
      } catch (e) {
        console.debug('[SnipKit] Could not send message to tab:', e.message);
      }
    });
  }
});
