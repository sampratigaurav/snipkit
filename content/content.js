// SnipKit - content.js

/**
 * Returns false if the extension context has been invalidated (e.g. the
 * extension was reloaded while this tab's old content script is still alive).
 * Accessing chrome.runtime.id throws in that state — we catch it here so
 * callers can bail out cleanly instead of throwing unhandled errors.
 */
function isExtensionContextValid() {
  try {
    return !!chrome.runtime?.id;
  } catch (e) {
    return false;
  }
}

/**
 * Core expansion handler. Shared between 'input' and 'keyup' listeners.
 * Using two listeners because Google Search and some custom elements suppress
 * the 'input' event — 'keyup' acts as a reliable fallback.
 */
function handleExpansion(event) {
  if (!isExtensionContextValid()) return;
  // Don't interfere with palette's own input
  if (event.target && event.target.id === 'snipkit-palette-input') return;

  const target = event.target;
  if (!target) return;

  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    if (target.readOnly || target.disabled || target.type === 'password') {
      return;
    }

    let cursorPos;
    try {
      cursorPos = target.selectionStart;
    } catch (e) {
      // selectionStart throws on certain <input> types (e.g., number, email)
      return;
    }

    if (typeof cursorPos !== 'number') return;

    const value = target.value;
    const scanStart = Math.max(0, cursorPos - 30);
    const textBeforeCursor = value.substring(scanStart, cursorPos);

    // Extract from the last whitespace (or start of value) up to cursor
    const words = textBeforeCursor.split(/\s/);
    const buffer = words[words.length - 1];

    console.debug('[SnipKit] active element:', target.tagName, target.type || '');
    console.debug('[SnipKit] buffer:', JSON.stringify(buffer));

    if (!buffer) return;

    const triggerStart = cursorPos - buffer.length;

    chrome.storage.local.get('snipkit_snippets', (data) => {
      const snippets = data.snipkit_snippets || [];
      console.debug('[SnipKit] snippets loaded:', snippets.length, snippets.map(s => s.trigger));

      const normalizedBuffer = buffer.toLowerCase();
      const matchedSnippet = snippets.find(s => s.trigger && s.trigger.toLowerCase() === normalizedBuffer);

      if (matchedSnippet) {
        target.setRangeText(matchedSnippet.expansion, triggerStart, cursorPos, 'end');

        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));

        console.debug('[SnipKit] expanded:', matchedSnippet.trigger);

        chrome.storage.local.get('snipkit_snippets', (usageData) => {
          const usageSnippets = usageData.snipkit_snippets || [];
          const idx = usageSnippets.findIndex(s => s.id === matchedSnippet.id);
          if (idx > -1) {
            usageSnippets[idx].usageCount = (usageSnippets[idx].usageCount || 0) + 1;
            chrome.storage.local.set({ snipkit_snippets: usageSnippets });
          }
        });
      }
    });

  } else if (target.isContentEditable || target.getAttribute('contenteditable') === 'true') {
    // Skip code blocks and <pre> elements
    if (target.getAttribute('role') === 'code' || target.closest('pre')) {
      return;
    }

    // Skip cross-origin iframes
    try {
      if (window.top !== window) {
        // Accessing cross-origin top properties will throw DOMException
        const _ = window.top.location.href;
      }
    } catch (e) {
      return;
    }

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;

    const text = node.textContent;
    const cursor = range.startOffset;
    const bufferStart = text.lastIndexOf(' ', cursor - 1) + 1;
    const buffer = text.slice(bufferStart, cursor);

    console.debug('[SnipKit] active element: contenteditable');
    console.debug('[SnipKit] buffer:', JSON.stringify(buffer));

    if (!buffer) return;

    chrome.storage.local.get('snipkit_snippets', (data) => {
      const snippets = data.snipkit_snippets || [];
      console.debug('[SnipKit] snippets loaded:', snippets.length, snippets.map(s => s.trigger));

      const normalizedBuffer = buffer.toLowerCase();
      const matchedSnippet = snippets.find(s => s.trigger && s.trigger.toLowerCase() === normalizedBuffer);

      if (matchedSnippet) {
        const deleteRange = document.createRange();
        deleteRange.setStart(node, bufferStart);
        deleteRange.setEnd(node, cursor);
        sel.removeAllRanges();
        sel.addRange(deleteRange);

        // execCommand('insertText') is deprecated per spec but remains the most
        // reliable cross-browser method for contenteditable injection as of 2025.
        document.execCommand('insertText', false, matchedSnippet.expansion);

        target.dispatchEvent(new Event('input', { bubbles: true }));

        console.debug('[SnipKit] expanded:', matchedSnippet.trigger);

        chrome.storage.local.get('snipkit_snippets', (usageData) => {
          const usageSnippets = usageData.snipkit_snippets || [];
          const idx = usageSnippets.findIndex(s => s.id === matchedSnippet.id);
          if (idx > -1) {
            usageSnippets[idx].usageCount = (usageSnippets[idx].usageCount || 0) + 1;
            chrome.storage.local.set({ snipkit_snippets: usageSnippets });
          }
        });
      }
    });
  }
}

// Primary listener — fires on value change in standard inputs
document.addEventListener('input', handleExpansion, true);

// Fallback listener — Google Search and some custom elements suppress 'input';
// 'keyup' ensures triggers are still caught on every keystroke.
document.addEventListener('keyup', handleExpansion, true);

// ============================================================
// COMMAND PALETTE
// Inject styles once, immediately at script load time.
// ============================================================
(function injectPaletteStyles() {
  const style = document.createElement('style');
  style.id = 'snipkit-palette-styles';
  style.textContent = `
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
    }
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
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
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
    #snipkit-palette-input {
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
    #snipkit-palette-list {
      list-style: none;
      margin: 0;
      padding: 6px;
      max-height: 320px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.1) transparent;
    }
    .snipkit-palette-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: 7px;
      cursor: pointer;
      transition: background 0.1s;
    }
    .snipkit-palette-item.selected {
      background: rgba(29,158,117,0.12);
    }
    .snipkit-palette-item:hover {
      background: rgba(255,255,255,0.04);
    }
    .snipkit-palette-item.selected:hover {
      background: rgba(29,158,117,0.15);
    }
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
    .snipkit-preview {
      font-size: 12px;
      color: #7a7870;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .snipkit-palette-item.selected .snipkit-preview {
      color: #e8e6df;
    }
    #snipkit-palette-empty {
      padding: 24px;
      text-align: center;
      font-size: 13px;
      color: #4a4844;
      list-style: none;
    }
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
  document.head.appendChild(style);
})();

// ============================================================
// PALETTE STATE
// ============================================================
let paletteVisible = false;
let paletteSnippets = [];
let filteredPaletteSnippets = [];
let selectedIndex = 0;
let paletteOverlay = null;
let lastFocusedElement = null; // element focused before palette opened

// ============================================================
// CREATE PALETTE DOM (idempotent — only builds once)
// ============================================================
function createPalette() {
  if (document.getElementById('snipkit-palette')) return;

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
  document.body.appendChild(overlay);
  paletteOverlay = overlay;

  // Close on backdrop click
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

  // Save whatever element has focus so we can restore it after closing
  lastFocusedElement = document.activeElement;

  createPalette();
  chrome.storage.local.get('snipkit_snippets', function (data) {
    paletteSnippets = data.snipkit_snippets || [];
    filterPalette('');
    const el = document.getElementById('snipkit-palette');
    el.style.display = 'flex';
    document.getElementById('snipkit-palette-input').value = '';
    document.getElementById('snipkit-palette-input').focus();
    paletteVisible = true;
  });
}

function closePalette() {
  const el = document.getElementById('snipkit-palette');
  if (el) el.style.display = 'none';
  paletteVisible = false;
  selectedIndex = 0;

  // Restore focus synchronously to the element that was active before the palette opened
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
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

  const countEl = document.getElementById('snipkit-palette-count');
  if (countEl) {
    countEl.textContent =
      filteredPaletteSnippets.length + ' snippet' +
      (filteredPaletteSnippets.length !== 1 ? 's' : '');
  }
}

function renderPaletteList() {
  const list = document.getElementById('snipkit-palette-list');
  if (!list) return;
  list.innerHTML = '';

  if (filteredPaletteSnippets.length === 0) {
    const empty = document.createElement('li');
    empty.id = 'snipkit-palette-empty';
    empty.textContent = 'No snippets found.';
    list.appendChild(empty);
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
    li.addEventListener('mouseenter', () => {
      selectedIndex = i;
      renderPaletteList();
    });

    list.appendChild(li);
  });

  // Scroll selected into view
  const selected = list.querySelector('.selected');
  if (selected) selected.scrollIntoView({ block: 'nearest' });
}

// ============================================================
// KEYBOARD NAVIGATION
// ============================================================
function handlePaletteKey(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex = Math.min(selectedIndex + 1, filteredPaletteSnippets.length - 1);
    renderPaletteList();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex = Math.max(selectedIndex - 1, 0);
    renderPaletteList();
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
  // so clipboard permission is valid. Closing first would revoke it.
  let copied = false;

  try {
    await navigator.clipboard.writeText(snippet.expansion);
    copied = true;
    console.debug('[SnipKit] clipboard write success');
  } catch (err) {
    console.debug('[SnipKit] clipboard API failed, trying execCommand fallback:', err);
    // Fallback: append textarea inside palette box so focus stays within the
    // extension overlay and execCommand('copy') remains permitted.
    try {
      const ta = document.createElement('textarea');
      ta.value = snippet.expansion;
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
      const box = document.getElementById('snipkit-palette-box');
      (box || document.body).appendChild(ta);
      ta.focus();
      ta.select();
      copied = document.execCommand('copy');
      ta.remove();
      console.debug('[SnipKit] execCommand copy result:', copied);
    } catch (e) {
      console.error('[SnipKit] all clipboard methods failed:', e);
    }
  }

  // Step 2: Close palette — closePalette() synchronously restores focus
  closePalette();

  // Step 3: Let the browser commit the focus change
  await new Promise(r => setTimeout(r, 80));

  // Step 4: Re-assert focus on the pre-palette element.
  // closePalette() already called .focus() but the 80ms wait may have
  // let the browser reset it to <body>, so we do it again.
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }

  // Attempt to focus the Google Docs iframe keyboard event target
  let docsTarget = null;
  try {
    docsTarget = document.querySelector('.docs-texteventtarget-iframe');
    if (docsTarget && docsTarget.contentDocument) {
      docsTarget.contentDocument.body.focus();
    }
  } catch (e) {
    docsTarget = null; // cross-origin — treat as non-Docs page
  }

  if (!copied) {
    showToast('Could not access clipboard. Try again.', 'error');
    return;
  }

  // Step 5: Attempt direct injection into standard focusable elements
  const el = document.activeElement;
  let injected = false;

  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') &&
      !el.readOnly && !el.disabled && el.type !== 'password') {
    try {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      el.setRangeText(snippet.expansion, start, end, 'end');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      injected = true;
    } catch (e) {}
  } else if (el && el.isContentEditable) {
    // contenteditable (Notion, GitHub issues, etc.)
    try {
      document.execCommand('insertText', false, snippet.expansion);
      injected = true;
    } catch (e) {}
  }

  // Step 6: For canvas/Docs — simulate Ctrl+Shift+V.
  // Chrome's clipboard trust is tied to a user gesture in the browsing context.
  // Ctrl+Shift+V (paste-without-formatting) bypasses this in Google Docs
  // and is generally more reliable than a plain Ctrl+V after a focus shift.
  if (!injected) {
    // Dispatch to Docs iframe body if available, otherwise active element
    const pasteTarget = (docsTarget && docsTarget.contentDocument)
      ? docsTarget.contentDocument.body
      : document.activeElement;

    ['keydown', 'keyup'].forEach(type => {
      pasteTarget.dispatchEvent(new KeyboardEvent(type, {
        key: 'v', code: 'KeyV',
        ctrlKey: true, shiftKey: true,
        bubbles: true, cancelable: true
      }));
    });

    // Give the key events a moment to be processed, then also attempt
    // execCommand paste as a secondary fallback
    await new Promise(r => setTimeout(r, 50));
    try { document.execCommand('paste'); } catch (e) {}

    showToast('\u2713 Copied! Press Ctrl+Shift+V to paste in Docs.', 'success');
  } else {
    showToast('\u2713 Expanded: ' + snippet.trigger, 'success');
  }

  // Step 7: Increment usage count
  if (isExtensionContextValid()) {
    chrome.storage.local.get('snipkit_snippets', function (d) {
      const all = d.snipkit_snippets || [];
      const idx = all.findIndex(s => s.id === snippet.id);
      if (idx > -1) {
        all[idx].usageCount = (all[idx].usageCount || 0) + 1;
        chrome.storage.local.set({ snipkit_snippets: all });
      }
    });
  }

  console.debug('[SnipKit] palette expand done:', snippet.trigger);
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
function showToast(message, type = 'success') {
  // Remove any existing toast
  const existing = document.getElementById('snipkit-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'snipkit-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  // Force reflow so the transition fires from the initial state
  toast.getBoundingClientRect();
  toast.classList.add('visible');

  const duration = type === 'success' ? 2500 : 4000;
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
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
