# SnipKit — Manual Test Checklist

> Last updated: 2026-04-01
> Test against: Chrome 120+ (Manifest V3)
> Load extension via: `chrome://extensions` → **Load unpacked** → select project root

---

## 1. Extension Loads Without Errors

- [ ] Go to `chrome://extensions`, click **Load unpacked**, select the SnipKit project root — no error banner appears
- [ ] On the extensions card, click **"service worker"** → DevTools Console shows `[SnipKit] Extension installed and ready.` with no red errors
- [ ] Extension icon appears in the Chrome toolbar showing the green `/` logo
- [ ] Clicking the icon opens the popup window — no blank screen, no console errors (right-click icon → **Inspect popup** to check)

---

## 2. Popup UI

### 2a. Initial State
- [ ] All 5 seeded snippets appear: `\usn`, `\stack`, `\intro`, `\repo`, `\pr`
- [ ] Each snippet card shows the correct trigger (monospaced pill) and a truncated expansion preview
- [ ] Snippet count badge in the header shows **5 snippets**
- [ ] The **"⚡ Ctrl+Shift+Space → palette · Ctrl+Shift+V to paste in Docs"** hint is visible at the bottom

### 2b. Search
- [ ] Type `stack` in the search bar → only `\stack` remains in the list
- [ ] Clear the search bar → all 5 snippets return
- [ ] Type `student` → only `\intro` appears (matches the expansion text)
- [ ] Type `zzz` → empty state message appears: **"No snippets yet. Add your first one."**

### 2c. Category Filter
- [ ] Click **Hackathon** pill → only `\stack` shows
- [ ] Click **GitHub** pill → `\repo` and `\pr` show
- [ ] Click **Work** pill → `\usn` and `\intro` show
- [ ] Click **All** pill → all 5 snippets return and the pill gets the active style
- [ ] Combining category + search works: select **GitHub**, type `repo` → only `\repo` shows

### 2d. Edit Snippet
- [ ] Click the ✎ (edit) button on `\stack` → modal opens with title **"Edit snippet"**
- [ ] Modal trigger field is pre-filled with `\stack`
- [ ] Modal expansion field is pre-filled with the full stack string
- [ ] Modal category select shows **Hackathon** pre-selected
- [ ] Change expansion text, click **Save** → snippet list updates immediately with new text
- [ ] Snippet count stays the same after edit

### 2e. Delete Snippet
- [ ] Click the × (delete) button on any snippet → browser confirm dialog appears
- [ ] Click **Cancel** in dialog → snippet remains in list
- [ ] Click × again → click **OK** → snippet disappears from list
- [ ] Snippet count badge decrements by 1

### 2f. New Snippet
- [ ] Click **＋ New snippet** → modal opens with title **"New snippet"**
- [ ] Trigger field is pre-filled with `\` (backslash only)
- [ ] Expansion field and category select are empty/default
- [ ] Fill trigger as `\test`, expansion as `Test expansion`, category **Other**
- [ ] Click **Save** → new snippet appears in list, count increments to 6

### 2g. Form Validation
- [ ] In new snippet modal, set trigger to `\ab` (2 chars after backslash), click **Save** → error: trigger too short, nothing saved
- [ ] Set trigger to `hello` (no backslash), click **Save** (or blur field) → backslash is auto-prepended, field shows `\hello`
- [ ] Manually remove backslash and blur → field auto-restores `\`
- [ ] Leave expansion empty, click **Save** → error shown on expansion field
- [ ] Enter a trigger identical to an existing snippet (`\usn`), click **Save** → duplicate warning shown

### 2h. Keyboard Shortcuts in Popup
- [ ] Modal open → press **Ctrl+Enter** (or **Cmd+Enter** on Mac) → modal saves/closes
- [ ] Modal open → press **Escape** → modal closes without saving
- [ ] Modal closed → press **Escape** → popup window closes

### 2i. Click-Outside Modal
- [ ] Open new snippet modal → click on the dark overlay area outside the modal card → modal closes

### 2j. Import / Export
- [ ] Click **⬆ Export** → browser downloads a file named `snipkit-snippets.json`
- [ ] Open the file — it's valid JSON, an array of snippet objects with correct fields
- [ ] Delete the `\test` snippet you created above
- [ ] Click **⬇ Import** → select the downloaded JSON → toast/alert shows imported & skipped counts
- [ ] `\test` reappears in the list

---

## 3. Text Expansion — Standard Fields (`<input>` / `<textarea>`)

> **Test pages:** `https://google.com` (search bar), `https://example.com` with any `<input>`

- [ ] Click into the Google search bar, type `\usn` — text immediately expands to `1DS22CS094 — Samprati Gaurav, Dayananda Sagar University`
- [ ] Type `\stack` → expands to the full tech stack string
- [ ] Type `\intro` → expands to the intro paragraph
- [ ] After expansion, cursor is positioned **after** the inserted text (not at start)
- [ ] Type a word then a space then `\usn` (e.g. `hello \usn`) → only `\usn` expands, `hello ` remains
- [ ] Type `testing\usn` (no space before trigger) → does **not** expand (trigger is not isolated)
- [ ] Click into a **password field** (`<input type="password">`), type `\usn` → nothing happens
- [ ] After expanding `\usn`, open the popup → the **usage count** for `\usn` has incremented by 1

---

## 4. Text Expansion — Contenteditable

> **Test pages:** `https://github.com` (new issue body), `https://notion.so` (any page body)

- [ ] Open a new GitHub issue, click into the description textarea (which is contenteditable), type `\stack` → expands correctly
- [ ] Open a Notion page, click into the page body, type `\intro` → expands correctly
- [ ] Expanded text is **plain text only** — inspect the DOM to confirm no `<b>`, `<span>`, or other HTML tags were injected around the expansion
- [ ] After expansion in GitHub/Notion, cursor is placed after the inserted text

---

## 5. Command Palette

### 5a. Opening / Closing
- [ ] On `https://google.com`, press **Ctrl+Shift+Space** (Windows/Linux) or **Cmd+Shift+Space** (Mac) → floating palette appears over the page
- [ ] Palette shows the SnipKit header logo, hint text (`↑↓ navigate · Enter select · Esc close`), search input, and all snippets listed
- [ ] Palette footer shows the correct snippet count
- [ ] Press **Escape** → palette closes, no snippet selected
- [ ] Click on the dark backdrop outside the palette box → palette closes
- [ ] Press shortcut again → palette re-opens fresh (search cleared, selection reset to first item)

### 5b. Search & Navigation
- [ ] Type `re` in the palette search input → list filters to `\repo`
- [ ] Clear the search → all snippets return
- [ ] Press **Arrow Down** → second item in list is highlighted
- [ ] Press **Arrow Down** repeatedly until the last item → does not go past the end
- [ ] Press **Arrow Up** from last item → selection moves up
- [ ] Press **Arrow Up** from first item → stays at first item (no wrap)
- [ ] Hover mouse over a snippet → that item highlights (mouseenter updates selection)

### 5c. Standard Site Injection (Google, GitHub, etc.)
- [ ] Go to `https://google.com`, click into the search bar
- [ ] Open palette (Ctrl+Shift+Space), select `\stack` with Enter
- [ ] Toast appears: **"✓ Expanded: \stack"**
- [ ] The full stack string is injected into the search bar at the cursor
- [ ] **No manual click needed** — the expansion happened automatically

### 5d. Google Docs (Canvas Editor)
- [ ] Open any Google Docs document, click into the document body (position your cursor)
- [ ] Press **Ctrl+Shift+Space** → palette opens over Docs
- [ ] Select `\intro` with Enter
- [ ] Toast appears: **"✓ Copied! Press Ctrl+Shift+V to paste in Docs."**
- [ ] Press **Ctrl+Shift+V** → the intro text is pasted into the document
- [ ] After palette closes, cursor is back in the Docs document (**no click needed** before pressing Ctrl+Shift+V)

### 5e. Usage Count via Palette
- [ ] After selecting a snippet via palette, open the SnipKit popup
- [ ] The selected snippet's usage count has incremented by 1

---

## 6. Persistence

- [ ] Add a new snippet via popup, close the popup, click elsewhere, reopen popup → new snippet still present
- [ ] Expand a snippet (increment usage count), close popup, reopen → usage count is still the incremented value
- [ ] Fully quit Chrome and relaunch → open popup → all snippets and usage counts persist
- [ ] After Chrome restart, text expansion (`\usn`) still works on a fresh tab

---

## 7. Edge Cases

- [ ] Navigate to an `http://` page (not `https://`) → extension icon is active, `\usn` expansion works
- [ ] Open 3 tabs side-by-side, expand `\usn` in each one → each expands independently with no cross-tab interference
- [ ] Create a snippet with a 500+ character expansion, trigger it → full text is inserted correctly, no truncation
- [ ] Create a snippet whose expansion contains emoji (e.g. `🚀 shipped it`) → emoji renders correctly after expansion
- [ ] Open `chrome://extensions` itself, try Ctrl+Shift+Space → palette does **not** open (Chrome blocks content scripts on privileged pages — expected)
- [ ] Open an iframe-heavy page (e.g. a page with embedded YouTube) → expansion in the main page still works; no JS errors in console

---

## 8. Known Limitations (Verify These Are Documented)

> These are **not bugs** — confirm the behaviour matches the documented expectation.

- [ ] **Google Docs:** Direct expansion via `\trigger` does not work (canvas renderer). Palette + Ctrl+Shift+V is the supported workflow.
- [ ] **Cross-origin iframes:** Typing triggers inside an embedded iframe from a different domain does not expand — expected, cannot inject across origins.
- [ ] **`vscode.dev` / canvas editors:** Palette + Ctrl+Shift+V workflow is the correct path.
- [ ] **`chrome://` pages:** Content scripts are blocked by Chrome policy — palette shortcut and trigger expansion will not work.
- [ ] **Password fields:** Expansion is intentionally blocked on `<input type="password">`.

---

*For a summary of these limitations suitable for the Chrome Web Store listing, see `KNOWN_ISSUES.md`.*
