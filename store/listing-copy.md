# SnipKit — Chrome Web Store Listing Copy

---

## SHORT DESCRIPTION
*(max 132 characters — current count: 109)*

```
Instant text expansion for developers. Type \stack and inject your full tech stack anywhere on the web.
```

---

## FULL DESCRIPTION

You're filling out a hackathon registration form. Tech stack used? GitHub profile? University roll number? Project description? You've typed all of it a hundred times. You open a notes app, hunt for the right snippet, copy it, switch back, paste it. Then do it again for the next field.

You're a developer. You automate everything — except this.

---

**SnipKit maps short triggers to full text blocks and expands them instantly, right inside the browser.** No app switching. No clipboard juggling. Type `\stack` in any text field and your entire tech stack appears. Type `\usn` and your university ID is there. Type `\intro` and your bio fills in. You keep typing, the form fills itself.

It's the tool you'd have built yourself if you had the weekend for it.

---

### How It Works

**1. Open the popup and create your snippets.**
Click the SnipKit icon, hit "+ New snippet," and map a short trigger to any block of text. Your university ID, your tech stack, your standard PR description, your pitch — anything you type more than twice a week becomes a snippet.

**2. Type your trigger anywhere.**
Go to any webpage — a hackathon form, a job application, a GitHub issue, a Discord message box. Type your trigger (e.g. `\stack`) and SnipKit detects it the moment you finish typing. No hotkey to remember, no mouse click required.

**3. Watch it expand.**
The trigger is replaced with your full expansion text instantly. Cursor lands right after the inserted text, so you keep typing without breaking flow.

---

### Features

**Expansion engine that actually works.** SnipKit handles all the input surfaces developers encounter: standard `<input>` and `<textarea>` fields, and contenteditable editors like GitHub issue descriptions, Notion pages, and Linear comments. Expansion is plain text only — no stray HTML, no formatting surprises.

**Command palette for everything else.** Some editors (Google Docs, VS Code in the browser) use canvas rendering and can't accept direct injection. Press `Ctrl+Shift+Space` (or `Cmd+Shift+Space` on Mac) on any page to open the SnipKit command palette — a floating search interface that copies your snippet to clipboard so you can paste with `Ctrl+Shift+V`. Works everywhere, no exceptions.

**Snippet categories to keep your library organized.** Tag snippets as Work, Hackathon, GitHub, or Other. Filter by category in the popup to find what you need fast. The search bar filters on both trigger and expansion text simultaneously.

**Usage counter.** Every time a snippet expands, its usage count increments. After a few weeks you'll know which snippets actually save you time — and which ones you added but never use.

**JSON import and export.** Your snippet library is yours. Export it as a clean JSON file whenever you want a backup, or to move to a new machine. Import from any compatible JSON — sneak your team's shared snippets in from Slack, carry your library between Chrome profiles.

---

### Who It's For

If you're a junior developer applying to internships, SnipKit means your tech stack, your GitHub handle, and your summary bio are one keypress away across every application form. If you're a CS student grinding hackathons, your team intro, your pitch abstract, and your university details fill themselves in while you focus on building. If you contribute to open source, your PR template, your changelog boilerplate, and your issue description format never get retyped.

In short: SnipKit is for anyone who types the same things more than they should, and wants to stop.

---

### Privacy — The Short Version

SnipKit has no backend. There are no servers, no accounts, no sign-in, no analytics, no telemetry, and no network requests made by the extension at any point.

All snippets are stored exclusively in `chrome.storage.local` — your browser's local storage, on your machine, under your control. The extension only requests two permissions: `storage` (to save your snippets) and `activeTab` (to detect which page you're on when the palette opens). That's it. If you uninstall SnipKit, your data stays in your browser's local storage until Chrome clears it normally.

No cloud. No account. No tracking. Just text expansion.

---

### Get Started

Install SnipKit, click the icon, and create your first snippet in 30 seconds. The five seed snippets — tech stack, university ID, intro, GitHub profile, and PR template — are ready the moment you install. Customize them or delete them. Add your own. Start typing.

Your clipboard is free.

---

## METADATA

| Field | Value |
|---|---|
| **Category** | Productivity |
| **Language** | English |
| **Permissions declared** | `storage`, `activeTab`, `tabs` |
| **Homepage / Support** | https://github.com/sampratigaurav/snipkit |
| **Version** | 1.0.0 |
| **Manifest Version** | 3 |
| **Tested on Chrome** | 120+ |

---

## ADDITIONAL STORE NOTES

*(Internal — do not paste into the listing)*

- Screenshots should show the popup and the before/after expansion demo at 1280×800
- Promo tile is 440×280 (small tile) — see `store/promo-tile.html`
- The short description already includes a code-style trigger (`\stack`) which
  performs well for developer-audience search queries on the CWS
- "100% local" and "no accounts" should be prominently visible in the first
  screenshot if possible — privacy-first positioning is a strong signal for
  developer users who read extension permission lists carefully
