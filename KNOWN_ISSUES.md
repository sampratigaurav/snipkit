# SnipKit — Known Issues & Limitations

> This document is intended for reference when writing the Chrome Web Store listing,
> responding to user reviews, and triaging bug reports.

---

## KI-001 — Google Docs: Direct Trigger Expansion Does Not Work

**Severity:** Expected limitation (not a bug)
**Affects:** Google Docs, Google Slides, Google Sheets formula bar

**Description:**
Google Docs renders document content on an HTML5 `<canvas>` element rather than
editable DOM nodes. The SnipKit content script cannot read or write to a canvas.
As a result, typing `\trigger` inside a Docs document has no effect.

**Workaround:**
Use the Command Palette (Ctrl+Shift+Space / Cmd+Shift+Space):
1. Position your cursor in the Docs document.
2. Open the palette and select the desired snippet.
3. Press **Ctrl+Shift+V** (paste without formatting) to insert the text.

**Why Ctrl+Shift+V instead of Ctrl+V?**
After a focus shift (palette closing), Chrome requires a new user gesture before
trusting a `Ctrl+V` paste action. `Ctrl+Shift+V` (paste without formatting) is
handled as a distinct Docs command and does not require re-establishing clipboard
trust, making it more reliable on the first keypress.

**Store listing language:**
> "Works on all websites with standard text fields. For Google Docs, use the
> command palette (Ctrl+Shift+Space) and paste with Ctrl+Shift+V."

---

## KI-002 — Cross-Origin Iframes Are Not Supported

**Severity:** Expected limitation (security constraint)
**Affects:** Any page with embedded third-party iframes (e.g. embedded Typeform, Intercom chat widgets)

**Description:**
Chrome's content security model prevents extension content scripts from accessing
the DOM of iframes loaded from a different origin than the parent page. Typing a
trigger inside such an iframe will have no effect.

**Workaround:**
Open the embedded form in its own tab (most iframes have a "open in new tab" option),
then use SnipKit normally.

**Store listing language:**
> "Text expansion works in the main page frame. Embedded third-party widgets
> (cross-origin iframes) are not supported due to browser security restrictions."

---

## KI-003 — Chrome Internal Pages (`chrome://`) Are Blocked

**Severity:** Expected limitation (Chrome policy)
**Affects:** `chrome://extensions`, `chrome://settings`, `chrome://newtab`, etc.

**Description:**
Chrome does not allow any extension to inject content scripts into its own
internal pages (`chrome://` URLs). Both trigger expansion and the command palette
shortcut will be silently inactive on these pages.

**Store listing language:**
> "SnipKit works on all regular web pages. Chrome's internal pages
> (chrome://extensions, etc.) are not accessible to any extension by design."

---

## KI-004 — Canvas-Based Web Editors (vscode.dev, Figma, etc.)

**Severity:** Expected limitation
**Affects:** `vscode.dev`, `figma.com` editing canvas, `excalidraw.com`, and similar

**Description:**
Applications that render a custom editing surface using WebGL, Canvas 2D, or a
custom input handling layer (as VS Code in the browser does) intercept keyboard
events before the DOM can process them. Direct trigger expansion does not work.

**Workaround:**
Same as KI-001 — use the Command Palette + Ctrl+Shift+V (or Ctrl+V if the editor
accepts it).

---

## KI-005 — Password Fields Are Intentionally Blocked

**Severity:** By design (security feature)
**Affects:** `<input type="password">` fields on all sites

**Description:**
SnipKit explicitly skips expansion in password fields. This is intentional:
expanding text in a password field could expose sensitive snippet content
or interfere with password manager behaviour.

---

## KI-006 — First Ctrl+V After Palette May Require a Second Press on Some Sites

**Severity:** Minor / intermittent
**Affects:** Sites other than Google Docs that use a custom event model

**Description:**
Chrome's clipboard paste trust model requires the paste action to occur within
the same event loop tick as a user gesture. When the palette closes and focus
shifts back to the page, there is a brief window (~80–120ms) during which Chrome
may not consider the page context "trusted" for a paste. On most sites this is
invisible because SnipKit injects directly. On canvas/custom editors where direct
injection is impossible, a second Ctrl+V press always works.

**Workaround:**
Press Ctrl+Shift+V (paste without formatting) instead of Ctrl+V — this is
handled by the application layer rather than the browser's clipboard permission
system, and works reliably on the first keypress.

---

## KI-007 — `clipboardRead` / `clipboardWrite` Manifest Permissions Not Used

**Severity:** Informational
**Affects:** `manifest.json`

**Description:**
These permissions were added and later removed after audit. In Manifest V3,
clipboard access in content scripts is governed by the **active tab's** security
context and the `navigator.clipboard` API's own permissions — not by extension
manifest permissions. Declaring `clipboardRead`/`clipboardWrite` in a MV3
extension triggers a Chrome Web Store policy review flag without providing any
benefit.

**Current state:** Permissions are `["storage", "activeTab", "tabs"]` — correct.

---

## Future Work / Planned Fixes

| ID | Description | Priority |
|---|---|---|
| FW-001 | Settings page to configure trigger prefix (currently hardcoded `\`) | Medium |
| FW-002 | `chrome.storage.sync` option to share snippets across devices | Medium |
| FW-003 | Dynamic variables in expansions (`{{date}}`, `{{clipboard}}`) | High |
| FW-004 | Auto-detect Google Docs and show palette hint proactively | Low |
| FW-005 | Snippet virtualization for large collections (100+ snippets) | Low |

---

*For step-by-step verification of all known limitations, see `TEST_CHECKLIST.md` section 8.*
