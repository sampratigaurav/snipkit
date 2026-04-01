<div align="center">

<img src="icons/icon128.png" alt="SnipKit" width="80" height="80" />

# SnipKit

**Keyboard-driven text expansion for developers.**

Type `\stack` anywhere on the web. Watch your full tech stack appear instantly.

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Available-1D9E75?style=flat-square&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/snipkit)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![Made with ❤️](https://img.shields.io/badge/Built%20by-Samprati%20Gaurav-1D9E75?style=flat-square)](https://samprati.dev)

[**Install from Chrome Web Store**](https://chromewebstore.google.com/detail/snipkit) · [Landing Page](https://sampratigaurav.github.io/snipkit) · [Privacy Policy](https://sampratigaurav.github.io/snipkit/privacy-policy.html)

</div>

---

## The problem

You're filling out a hackathon registration form. Tech stack used? GitHub profile? University roll number? Project description?

You've typed all of it a hundred times. You open a notes app, hunt for the right snippet, copy it, switch back, paste it. Then do it again for the next field.

You're a developer. You automate everything — except this.

## The solution

SnipKit maps short triggers to full text blocks and expands them instantly, right inside the browser. No app switching. No clipboard juggling.

Type `\stack` in any text field → your entire tech stack appears.  
Type `\usn` → your university roll number is there.  
Type `\intro` → your bio fills in.

---

## Demo

| Type the trigger | Get the expansion |
|---|---|
| `\stack` | `React · TypeScript · Node.js · Socket.io · PostgreSQL · Tailwind CSS` |
| `\usn` | `1DS22CS094 — Samprati Gaurav, Dayananda Sagar University` |
| `\intro` | `Hi, I'm Sam — a 2nd-year CS (Cyber Security) student at DSU...` |
| `\repo` | `https://github.com/sampratigaurav — SyncWatch, Duet, SnipKit` |
| `\pr` | `## Summary\n**What**: \n**Why**: \n**Testing**: ` |

---

## Features

### ⚡ Instant text expansion
Background content script listens for your triggers with zero perceptible latency. Works in `<input>`, `<textarea>`, and `contenteditable` elements — covering standard forms, GitHub, Notion, Linear, and most rich-text editors.

### ⌨️ Command palette
Press `Ctrl+Shift+Space` (or `Cmd+Shift+Space` on Mac) to open a floating search palette over any page — including Google Docs. Fuzzy search your snippets, navigate with arrow keys, select with Enter.

### 📂 Snippet categories
Organise snippets into **Work**, **Hackathon**, **GitHub**, and **Other**. Filter by category in the popup instantly.

### 📊 Usage counter
Every expansion is tracked. See which snippets save you the most time.

### ⬆️ Import / Export
Back up your entire snippet library as a single JSON file. Restore or share it in one click.

### 🔒 Strictly local
All data lives in `chrome.storage.local` on your device. No servers. No accounts. No analytics. No network requests. Ever.

---

## Installation

### From the Chrome Web Store
1. Visit the [SnipKit listing](https://chromewebstore.google.com/detail/snipkit)
2. Click **Add to Chrome**
3. Click the SnipKit icon in your toolbar to get started

### From source (development)
```bash
git clone https://github.com/sampratigaurav/snipkit.git
cd snipkit
```
1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `snipkit/` folder

---

## How it works

```
User types \stack in any input field
         ↓
content.js catches the input event (capture phase)
         ↓
Checks buffer against snippets in chrome.storage.local
         ↓
Match found → deletes trigger → injects expansion
         ↓
Dispatches input + change events so frameworks detect the change
```

For `contenteditable` editors (GitHub, Notion):
```
Buffer extracted via Selection API
         ↓
Trigger deleted via createRange()
         ↓
Expansion inserted via document.execCommand('insertText')
```

For canvas-based editors (Google Docs):
```
Ctrl+Shift+Space → command palette opens
         ↓
Snippet selected → copied to clipboard BEFORE palette closes
         ↓
Focus restored to page automatically
         ↓
User presses Ctrl+Shift+V → pastes as plain text
```

---

## Project structure

```
snipkit/
├── manifest.json          # MV3 manifest — permissions, content scripts, commands
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.js           # CRUD, search, filter, import/export logic
│   └── popup.css          # Dark theme styling
├── content/
│   └── content.js         # Text expansion engine + command palette
├── background/
│   └── service-worker.js  # Command routing, seed data on install
├── shared/
│   └── storage.js         # chrome.storage.local CRUD layer
├── icons/                 # Extension icons (16, 48, 128px)
├── docs/                  # GitHub Pages (landing page + privacy policy)
│   ├── index.html
│   └── privacy-policy.html
└── store/                 # Chrome Web Store assets
    ├── screenshot-final.png
    ├── promo-tile-final.png
    └── listing-copy.md
```

---

## Tech stack

- **Vanilla JavaScript** — no frameworks, no build step, no dependencies
- **Chrome Extension Manifest V3** — service workers, declarative content scripts
- **chrome.storage.local** — all data stored locally, zero backend
- **Selection API + execCommand** — cross-editor text injection
- **navigator.clipboard** — clipboard access for palette paste flow

---

## Known limitations

| Site | Status | Reason |
|---|---|---|
| Standard inputs / textareas | ✅ Full support | Direct DOM injection |
| GitHub, Notion, Linear | ✅ Full support | contenteditable injection |
| Google Docs | ⚠️ Palette + Ctrl+Shift+V | Canvas renderer, no DOM access |
| VS Code in browser | ⚠️ Palette + Ctrl+Shift+V | Canvas renderer |
| Cross-origin iframes | ❌ Not supported | Browser security restriction |
| Password fields | ❌ Intentionally skipped | Security |

---

## Contributing

Issues and PRs are welcome. If you find a site where expansion doesn't work, open an issue with the URL and I'll look into it.

```bash
# Clone and load unpacked as described above
# Make your changes
# Test manually in Chrome
# Open a PR
```

---

## Privacy

SnipKit collects no user data. All snippets are stored locally using `chrome.storage.local` and never leave your device. The extension makes zero network requests.

Full privacy policy: [sampratigaurav.github.io/snipkit/privacy-policy.html](https://sampratigaurav.github.io/snipkit/privacy-policy.html)

---

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

Built by [Samprati Gaurav](https://samprati.dev) · 2nd year CS (Cyber Security) @ Dayananda Sagar University

*Also check out [SyncWatch](https://github.com/sampratigaurav/syncwatch)*

</div>
