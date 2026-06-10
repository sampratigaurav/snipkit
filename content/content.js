// SnipKit - content.js
'use strict';

// ============================================================
// CONTEXT VALIDITY
// ============================================================
function isExtensionContextValid() {
  try {
    return !!chrome.runtime?.id;
  } catch (e) {
    return false;
  }
}

// ============================================================
// CROSS-ORIGIN IFRAME DETECTION (A-014)
// Evaluated once at script load — much cheaper than per-keystroke.
// Original code used window.top which misses same-origin grandchild
// iframes; window.parent is the correct immediate-parent check.
// ============================================================
let _inCrossOriginIframe = false;
try {
  // Accessing window.parent.location.href throws DOMException when the
  // immediate parent frame is cross-origin.
  void window.parent.location.href;
} catch (_e) {
  _inCrossOriginIframe = (window !== window.parent);
}

// ============================================================
// USAGE-COUNT QUEUE (A-003)
// Serialises all storage writes to prevent the read→modify→write
// race condition that silently drops increments when two expansions
// happen in rapid succession.
// ============================================================
const _usageQueue = [];
let   _usageFlushPending = false;

function queueUsageIncrement(id) {
  _usageQueue.push(id);
  _flushUsageQueue();
}

function _flushUsageQueue() {
  if (_usageFlushPending || _usageQueue.length === 0) return;
  _usageFlushPending = true;

  // Drain the entire queue in a single atomic read→write
  const pending = _usageQueue.splice(0);

  chrome.storage.local.get('snipkit_snippets', (data) => {
    const snippets = data.snipkit_snippets || [];
    pending.forEach(id => {
      const idx = snippets.findIndex(s => s.id === id);
      if (idx > -1) snippets[idx].usageCount = (snippets[idx].usageCount || 0) + 1;
    });
    chrome.storage.local.set({ snipkit_snippets: snippets }, () => {
      _usageFlushPending = false;
      _flushUsageQueue(); // drain anything that queued during the write
    });
  });
}

// ============================================================
// CONTENTEDITABLE INSERTION (A-004)
// Replaces the bare execCommand('insertText') with a layered
// approach that covers framework-driven editors (React/Vue/Notion)
// as well as standard contenteditable nodes.
// ============================================================
function insertTextIntoContentEditable(text) {
  const target = document.activeElement;
  if (!target) return false;

  // Layer 1: Fire beforeinput — consumed by React/Vue/Quill/Tiptap editors.
  // These editors handle 'insertText' beforeinput and update their virtual DOM,
  // which then syncs to the real DOM. We fire this first so they can intercept.
  try {
    target.dispatchEvent(new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: text,
      bubbles: true,
      cancelable: true,
    }));
  } catch (_) {}

  // Layer 2: execCommand('insertText') — still the most cross-site reliable
  // method in Chrome for standard contenteditable as of 2026.
  try {
    if (document.execCommand('insertText', false, text)) return true;
  } catch (_) {}

  // Layer 3: Manual range insertion — last resort when execCommand is unavailable.
  try {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      target.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
  } catch (_) {}

  return false;
}

// ============================================================
// EXPANSION HANDLER
// ============================================================
function handleExpansion(event) {
  if (!isExtensionContextValid()) return;
  if (_inCrossOriginIframe) return; // (A-014)

  const target = event.target;
  if (!target) return;

  // (A-017) Never trigger inside any SnipKit-owned UI element.
  // Covers palette input, backdrop, toast, and any future elements.
  if (target.closest && target.closest('#snipkit-shadow-host')) return;

  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    if (target.readOnly || target.disabled || target.type === 'password') return;

    let cursorPos;
    try {
      cursorPos = target.selectionStart;
    } catch (_) {
      // selectionStart throws on certain <input> types (number, email, etc.)
      return;
    }
    if (typeof cursorPos !== 'number') return;

    const value = target.value;
    const scanStart = Math.max(0, cursorPos - 30);
    const textBeforeCursor = value.substring(scanStart, cursorPos);

    // Extract the word immediately before the cursor (split on whitespace)
    const words = textBeforeCursor.split(/\s/);
    const buffer = words[words.length - 1];
    if (!buffer) return;

    const triggerStart = cursorPos - buffer.length;

    chrome.storage.local.get('snipkit_snippets', (data) => {
      const snippets = data.snipkit_snippets || [];
      const normalizedBuffer = buffer.toLowerCase();
      const matched = snippets.find(s => s.trigger && s.trigger.toLowerCase() === normalizedBuffer);
      if (!matched) return;

      target.setRangeText(matched.expansion, triggerStart, cursorPos, 'end');
      target.dispatchEvent(new Event('input',  { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));

      console.debug('[SnipKit] expanded (input):', matched.trigger);
      queueUsageIncrement(matched.id); // (A-003) serialised write
    });

  } else if (target.isContentEditable || target.getAttribute('contenteditable') === 'true') {
    // Skip code blocks and <pre> elements
    if (target.getAttribute('role') === 'code' || target.closest('pre')) return;

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node  = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;

    const text   = node.textContent;
    const cursor = range.startOffset;
    // Find the start of the current word (last space before cursor)
    const bufferStart = text.lastIndexOf(' ', cursor - 1) + 1;
    const buffer = text.slice(bufferStart, cursor);
    if (!buffer) return;

    chrome.storage.local.get('snipkit_snippets', (data) => {
      const snippets = data.snipkit_snippets || [];
      const normalizedBuffer = buffer.toLowerCase();
      const matched = snippets.find(s => s.trigger && s.trigger.toLowerCase() === normalizedBuffer);
      if (!matched) return;

      // Select the trigger text so insertTextIntoContentEditable replaces it
      const deleteRange = document.createRange();
      deleteRange.setStart(node, bufferStart);
      deleteRange.setEnd(node, cursor);
      sel.removeAllRanges();
      sel.addRange(deleteRange);

      const ok = insertTextIntoContentEditable(matched.expansion); // (A-004)
      if (ok) {
        target.dispatchEvent(new Event('input', { bubbles: true }));
        console.debug('[SnipKit] expanded (contenteditable):', matched.trigger);
        queueUsageIncrement(matched.id); // (A-003)
      }
    });
  }
}

// ============================================================
// DOUBLE-EXPANSION DEDUP (A-002)
// On a standard <input>/<textarea>, every keystroke fires both
// the 'input' event AND 'keyup'. Without a guard, handleExpansion
// runs twice: once per listener. The second call reads the
// already-expanded value and can corrupt output.
// Fix: 'keyup' is only handled if 'input' did NOT already fire
// for this exact target within the last 50 ms.
// ============================================================
let _lastInputTarget = null;
let _lastInputTime   = 0;

document.addEventListener('input', (e) => {
  _lastInputTarget = e.target;
  _lastInputTime   = Date.now();
  handleExpansion(e);
}, true);

document.addEventListener('keyup', (e) => {
  const sameTarget   = e.target === _lastInputTarget;
  const recentInput  = (Date.now() - _lastInputTime) < 50;
  if (sameTarget && recentInput) return; // already handled by 'input'
  handleExpansion(e);
}, true);

// ============================================================
// PALETTE CSS (A-005, A-012)
// Stored as a JS string and applied via CSSStyleSheet.replaceSync()
// + adoptedStyleSheets. This is a programmatic API (not an HTML
// <style> tag), so it is NOT blocked by the page's Content-Security-
// Policy — no web_accessible_resources entry required.
// The shadow DOM boundary prevents host-page styles from leaking in.
// ============================================================
const PALETTE_CSS = `
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* Overlay — full-viewport backdrop */
  #snipkit-palette {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    z-index: 2147483647;
    display: none;
    align-items: flex-start;
    justify-content: center;
    padding-top: 15vh;
    font-family: system-ui, -apple-system, sans-serif;
    pointer-events: none;
  }
  #snipkit-palette.open {
    display: flex;
    pointer-events: auto;
  }

  /* Palette card */
  #snipkit-palette-box {
    background: #131311;
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 12px;
    width: 560px;
    max-width: 90vw;
    overflow: hidden;
    box-shadow: 0 24px 60px rgba(0,0,0,0.6);
    animation: snipkit-in 0.15s ease;
  }
  @keyframes snipkit-in {
    from { opacity: 0; transform: scale(0.97) translateY(-6px); }
    to   { opacity: 1; transform: scale(1)    translateY(0);    }
  }

  /* Header */
  #snipkit-palette-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px 6px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  #snipkit-palette-logo {
    font-size: 11px;
    font-weight: 600;
    color: #1D9E75;
    letter-spacing: 0.04em;
  }
  #snipkit-palette-hint {
    font-size: 10px;
    color: #4a4844;
  }

  /* Search input */
  #snipkit-palette-input {
    display: block;
    width: 100%;
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 14px 16px;
    font-size: 15px;
    color: #e8e6df;
    outline: none;
    font-family: system-ui, -apple-system, sans-serif;
  }
  #snipkit-palette-input::placeholder { color: #4a4844; }

  /* Snippet list */
  #snipkit-palette-list {
    list-style: none;
    margin: 0;
    padding: 6px;
    max-height: 320px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.1) transparent;
  }
  #snipkit-palette-list::-webkit-scrollbar       { width: 4px; }
  #snipkit-palette-list::-webkit-scrollbar-track  { background: transparent; }
  #snipkit-palette-list::-webkit-scrollbar-thumb  { background: rgba(255,255,255,0.1); border-radius: 2px; }

  /* Snippet row */
  .snipkit-palette-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 7px;
    cursor: pointer;
    transition: background 0.1s;
  }
  .snipkit-palette-item.selected       { background: rgba(29,158,117,0.12); }
  .snipkit-palette-item:hover          { background: rgba(255,255,255,0.04); }
  .snipkit-palette-item.selected:hover { background: rgba(29,158,117,0.15); }

  /* Trigger pill */
  .snipkit-pill {
    font-family: monospace;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(29,158,117,0.12);
    color: #5DCAA5;
    border: 1px solid rgba(29,158,117,0.25);
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* Expansion preview */
  .snipkit-preview {
    font-size: 12px;
    color: #7a7870;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }
  .snipkit-palette-item.selected .snipkit-preview { color: #e8e6df; }

  /* Empty state */
  #snipkit-palette-empty {
    padding: 24px;
    text-align: center;
    font-size: 13px;
    color: #4a4844;
    list-style: none;
  }

  /* Footer */
  #snipkit-palette-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    border-top: 1px solid rgba(255,255,255,0.06);
    font-size: 10px;
    color: #4a4844;
  }
  #snipkit-palette-count {
    font-weight: 500;
    color: #7a7870;
  }

  /* Toast */
  #snipkit-toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(8px);
    background: #131311;
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 8px;
    padding: 10px 18px;
    font-size: 13px;
    color: #e8e6df;
    font-family: system-ui, -apple-system, sans-serif;
    z-index: 2147483647;
    opacity: 0;
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;
    white-space: nowrap;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  }
  #snipkit-toast.visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
`;

// ============================================================
// SHADOW DOM HOST (A-005, A-006, A-012)
// Created lazily on first palette open so it does not affect
// pages where the palette is never used.
// ============================================================
let _shadowRoot = null;
let _shadowHost = null;

function ensureShadowRoot() {
  if (_shadowRoot) return;

  _shadowHost = document.createElement('div');
  _shadowHost.id = 'snipkit-shadow-host';
  // Cover the viewport with pointer-events:none so it never
  // blocks interaction when the palette is closed.
  _shadowHost.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:2147483647;';

  // (A-006) Guard against null body on a still-loading page
  (document.body || document.documentElement).appendChild(_shadowHost);

  _shadowRoot = _shadowHost.attachShadow({ mode: 'closed' });

  // (A-005) adoptedStyleSheets is a JS API — NOT blocked by page CSP.
  // This is the recommended approach for extension UIs that must work
  // on CSP-strict sites (GitHub, Linear, banking apps, etc.).
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(PALETTE_CSS);
  _shadowRoot.adoptedStyleSheets = [sheet];
}

// ============================================================
// PALETTE STATE
// ============================================================
let paletteVisible          = false;
let paletteSnippets         = [];
let filteredPaletteSnippets = [];
let selectedIndex           = 0;
let lastFocusedElement      = null; // element focused before palette opened

// Stored DOM references — avoids repeated shadow-root queries
let _paletteOverlay = null;
let _paletteInput   = null;
let _paletteList    = null;
let _paletteCount   = null;
let _toastEl        = null;

// ============================================================
// CREATE PALETTE DOM (idempotent — only builds once)
// ============================================================
function createPalette() {
  if (_paletteOverlay) return; // already built

  ensureShadowRoot(); // (A-006, A-012)

  // Overlay (full-screen backdrop)
  const overlay = document.createElement('div');
  overlay.id = 'snipkit-palette';

  const box = document.createElement('div');
  box.id = 'snipkit-palette-box';

  // Header
  const header = document.createElement('div');
  header.id = 'snipkit-palette-header';
  const logo = document.createElement('span');
  logo.id = 'snipkit-palette-logo';
  logo.textContent = '⚡ SnipKit';
  const hint = document.createElement('span');
  hint.id = 'snipkit-palette-hint';
  hint.textContent = '↑↓ navigate · Enter select · Esc close';
  header.appendChild(logo);
  header.appendChild(hint);

  // Search input
  const input = document.createElement('input');
  input.id = 'snipkit-palette-input';
  input.type = 'text';
  input.placeholder = 'Search snippets...';
  input.autocomplete = 'off';
  input.spellcheck = false;

  // List
  const list = document.createElement('ul');
  list.id = 'snipkit-palette-list';

  // Footer
  const footer = document.createElement('div');
  footer.id = 'snipkit-palette-footer';
  const count = document.createElement('span');
  count.id = 'snipkit-palette-count';
  const footerNote = document.createElement('span');
  footerNote.textContent = 'Copied · press Ctrl+V / Cmd+V to paste in Docs';
  footer.appendChild(count);
  footer.appendChild(footerNote);

  box.appendChild(header);
  box.appendChild(input);
  box.appendChild(list);
  box.appendChild(footer);
  overlay.appendChild(box);

  // Append into shadow root — completely isolated from page DOM (A-012)
  _shadowRoot.appendChild(overlay);

  // Store references
  _paletteOverlay = overlay;
  _paletteInput   = input;
  _paletteList    = list;
  _paletteCount   = count;

  // Close on backdrop click (click on overlay but not on the box)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePalette();
  });

  // Search
  input.addEventListener('input', (e) => {
    filterPalette(e.target.value.trim());
  });

  // Keyboard navigation
  input.addEventListener('keydown', handlePaletteKey);
}

// ============================================================
// OPEN / CLOSE
// ============================================================
function openPalette() {
  if (!isExtensionContextValid()) return;

  // Save the currently focused element to restore after closing
  lastFocusedElement = document.activeElement;

  createPalette();
  chrome.storage.local.get('snipkit_snippets', (data) => {
    paletteSnippets = data.snipkit_snippets || [];
    filterPalette('');
    _paletteOverlay.classList.add('open');
    _paletteInput.value = '';
    _paletteInput.focus();
    paletteVisible = true;
  });
}

function closePalette() {
  if (_paletteOverlay) _paletteOverlay.classList.remove('open');
  paletteVisible = false;
  selectedIndex  = 0;

  // (A-009) Only restore focus if the element is still connected to the DOM.
  // After extension reload (context invalidation), the stored reference is a
  // detached node — calling .focus() on it throws or silently no-ops.
  if (
    lastFocusedElement?.isConnected &&
    typeof lastFocusedElement.focus === 'function'
  ) {
    lastFocusedElement.focus();
  }
}

// ============================================================
// FILTER & RENDER
// ============================================================
function filterPalette(query) {
  filteredPaletteSnippets = query
    ? paletteSnippets.filter(s =>
        s.trigger.toLowerCase().includes(query.toLowerCase()) ||
        s.expansion.toLowerCase().includes(query.toLowerCase())
      )
    : paletteSnippets;

  selectedIndex = 0;
  renderPaletteList();

  if (_paletteCount) {
    _paletteCount.textContent =
      filteredPaletteSnippets.length + ' snippet' +
      (filteredPaletteSnippets.length !== 1 ? 's' : '');
  }
}

function renderPaletteList() {
  if (!_paletteList) return;
  _paletteList.innerHTML = '';

  if (filteredPaletteSnippets.length === 0) {
    const empty = document.createElement('li');
    empty.id = 'snipkit-palette-empty';
    empty.textContent = 'No snippets found.';
    _paletteList.appendChild(empty);
    return;
  }

  filteredPaletteSnippets.forEach((snippet, i) => {
    const li = document.createElement('li');
    li.className = 'snipkit-palette-item' + (i === selectedIndex ? ' selected' : '');

    const pill = document.createElement('span');
    pill.className = 'snipkit-pill';
    pill.textContent = snippet.trigger;

    const preview = document.createElement('span');
    preview.className = 'snipkit-preview';
    preview.textContent = snippet.expansion.length > 60
      ? snippet.expansion.slice(0, 60) + '…'
      : snippet.expansion;
    preview.title = snippet.expansion;

    li.appendChild(pill);
    li.appendChild(preview);

    li.addEventListener('click', () => selectSnippet(i));

    // (A-008) Toggle .selected class in-place instead of rebuilding the entire
    // list on every mouseenter — eliminates the O(n) re-render storm.
    li.addEventListener('mouseenter', () => {
      _paletteList.querySelector('.snipkit-palette-item.selected')
        ?.classList.remove('selected');
      li.classList.add('selected');
      selectedIndex = i;
    });

    _paletteList.appendChild(li);
  });

  // Scroll selected item into view
  _paletteList.querySelector('.selected')
    ?.scrollIntoView({ block: 'nearest' });
}

// ============================================================
// KEYBOARD NAVIGATION
// ============================================================
function handlePaletteKey(e) {
  const items = _paletteList
    ? Array.from(_paletteList.querySelectorAll('.snipkit-palette-item'))
    : [];

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex = Math.min(selectedIndex + 1, filteredPaletteSnippets.length - 1);
    // (A-008) Toggle class, no full re-render
    items.forEach((item, i) => item.classList.toggle('selected', i === selectedIndex));
    items[selectedIndex]?.scrollIntoView({ block: 'nearest' });

  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex = Math.max(selectedIndex - 1, 0);
    // (A-008) Toggle class, no full re-render
    items.forEach((item, i) => item.classList.toggle('selected', i === selectedIndex));
    items[selectedIndex]?.scrollIntoView({ block: 'nearest' });

  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (filteredPaletteSnippets[selectedIndex]) {
      selectSnippet(selectedIndex);
    }

  } else if (e.key === 'Escape') {
    closePalette();
  }
}

// ============================================================
// SELECT & INJECT
// ============================================================
async function selectSnippet(index) {
  const snippet = filteredPaletteSnippets[index];
  if (!snippet) return;

  // Step 1: Copy to clipboard FIRST — palette is still open and focused here,
  // so navigator.clipboard permission is valid under the current user gesture.
  // Closing first would move focus away and revoke the permission.
  let copied = false;

  try {
    await navigator.clipboard.writeText(snippet.expansion);
    copied = true;
    console.debug('[SnipKit] clipboard write success');
  } catch (err) {
    console.debug('[SnipKit] clipboard API failed, trying execCommand fallback:', err);
    // Fallback: append a textarea inside the palette box so focus stays within
    // the extension overlay and execCommand('copy') remains permitted.
    try {
      const ta = document.createElement('textarea');
      ta.value = snippet.expansion;
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
      const box = _shadowRoot.getElementById('snipkit-palette-box');
      (box || _shadowRoot).appendChild(ta);
      ta.focus();
      ta.select();
      copied = document.execCommand('copy');
      ta.remove();
      console.debug('[SnipKit] execCommand copy result:', copied);
    } catch (e) {
      console.error('[SnipKit] all clipboard methods failed:', e);
    }
  }

  // Step 2: Close palette — closePalette() synchronously restores focus (A-009)
  closePalette();

  // Step 3: Let the browser commit the focus change
  await new Promise(r => setTimeout(r, 80));

  // Step 4: Re-assert focus (80ms may have let the browser reset it to <body>)
  // (A-009) isConnected guard prevents errors on detached elements
  if (
    lastFocusedElement?.isConnected &&
    typeof lastFocusedElement.focus === 'function'
  ) {
    lastFocusedElement.focus();
  }

  // Attempt to focus the Google Docs iframe keyboard event target
  let docsTarget = null;
  try {
    docsTarget = document.querySelector('.docs-texteventtarget-iframe');
    if (docsTarget?.contentDocument) {
      docsTarget.contentDocument.body.focus();
    }
  } catch (_) {
    docsTarget = null; // cross-origin — not a Docs page
  }

  if (!copied) {
    showToast('Could not access clipboard. Try again.', 'error');
    return;
  }

  // Step 5: Attempt direct injection into standard focusable elements
  const el = document.activeElement;
  let injected = false;

  if (
    el &&
    (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') &&
    !el.readOnly && !el.disabled && el.type !== 'password'
  ) {
    try {
      const start = el.selectionStart ?? el.value.length;
      const end   = el.selectionEnd   ?? el.value.length;
      el.setRangeText(snippet.expansion, start, end, 'end');
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      injected = true;
    } catch (_) {}

  } else if (el?.isContentEditable) {
    // (A-004) Use layered insertion for contenteditable
    injected = insertTextIntoContentEditable(snippet.expansion);
  }

  // Step 6: For canvas / Google Docs — simulate Ctrl+Shift+V.
  // Chrome's clipboard trust requires the paste to be within the same
  // event loop tick as a user gesture. Ctrl+Shift+V (paste without
  // formatting) is handled by Docs as a distinct command and is more
  // reliable than Ctrl+V after a focus shift.
  if (!injected) {
    const pasteTarget = docsTarget?.contentDocument
      ? docsTarget.contentDocument.body
      : document.activeElement;

    ['keydown', 'keyup'].forEach(type => {
      pasteTarget.dispatchEvent(new KeyboardEvent(type, {
        key: 'v', code: 'KeyV',
        ctrlKey: true, shiftKey: true,
        bubbles: true, cancelable: true,
      }));
    });

    await new Promise(r => setTimeout(r, 50));
    try { document.execCommand('paste'); } catch (_) {}

    showToast('\u2713 Copied! Press Ctrl+Shift+V to paste in Docs.', 'success');
  } else {
    showToast('\u2713 Expanded: ' + snippet.trigger, 'success');
  }

  // Step 7: Increment usage count via serialised queue (A-003)
  if (isExtensionContextValid()) {
    queueUsageIncrement(snippet.id);
  }

  console.debug('[SnipKit] palette expand done:', snippet.trigger);
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
function showToast(message, type = 'success') {
  // Ensure shadow root exists (A-006) — toast can be shown even without
  // the palette having been opened yet.
  ensureShadowRoot();

  // Reuse existing toast element rather than creating a new one each time
  if (!_toastEl || !_toastEl.isConnected) {
    _toastEl = document.createElement('div');
    _toastEl.id = 'snipkit-toast';
    _shadowRoot.appendChild(_toastEl);
  }

  _toastEl.classList.remove('visible');
  _toastEl.textContent = message;

  // Force reflow so the transition fires from the initial (hidden) state
  _toastEl.getBoundingClientRect();
  _toastEl.classList.add('visible');

  const duration    = type === 'success' ? 2500 : 4000;
  const thisMessage = message;
  setTimeout(() => {
    // Only hide if this is still the same message (no newer toast replaced it)
    if (_toastEl && _toastEl.textContent === thisMessage) {
      _toastEl.classList.remove('visible');
    }
  }, duration);
}

// ============================================================
// MESSAGE LISTENER — receives toggle-palette from service worker
// ============================================================
chrome.runtime.onMessage.addListener(function (message) {
  if (!isExtensionContextValid()) return;
  if (message.action === 'toggle-palette') {
    if (paletteVisible) {
      closePalette();
    } else {
      openPalette();
    }
  }
});
