// SnipKit - shared/storage.js

const SNIPPETS_KEY = 'snipkit_snippets';
const CONFIG_KEY   = 'snipkit_config';
const DEFAULT_PREFIX = '\\';

// ============================================================
// UUID helper (A-015)
// crypto.randomUUID() requires a secure context; fall back to a
// timestamp+random string in the (theoretical) case it is absent.
// ============================================================
function generateId() {
  return typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ============================================================
// SEED DATA (A-016)
// Single source of truth — imported by the service worker on
// onInstalled. Never called automatically from getAllSnippets.
// ============================================================
export const SEED_SNIPPETS = [
  {
    id: '1',
    trigger: '\\usn',
    expansion: '1DS22CS094 \u2014 Samprati Gaurav, Dayananda Sagar University',
    category: 'work',
    usageCount: 0,
    createdAt: 0  // will be set to Date.now() at seed time
  },
  {
    id: '2',
    trigger: '\\stack',
    expansion: 'React \u00b7 TypeScript \u00b7 Node.js \u00b7 Socket.io \u00b7 PostgreSQL \u00b7 Tailwind CSS \u00b7 Vite',
    category: 'hackathon',
    usageCount: 0,
    createdAt: 0
  },
  {
    id: '3',
    trigger: '\\intro',
    expansion: "Hi, I'm Sam \u2014 a 2nd-year CS (Cyber Security) student at DSU. I build and ship web apps independently.",
    category: 'work',
    usageCount: 0,
    createdAt: 0
  },
  {
    id: '4',
    trigger: '\\repo',
    expansion: 'https://github.com/samprati-gaurav \u2014 SyncWatch, Duet, SnipKit',
    category: 'github',
    usageCount: 0,
    createdAt: 0
  },
  {
    id: '5',
    trigger: '\\pr',
    expansion: '## Summary\n**What**: \n**Why**: \n**Testing**: ',
    category: 'work',
    usageCount: 0,
    createdAt: 0
  }
];

export const seedDefaultSnippets = async () => {
  const now = Date.now();
  const seed = SEED_SNIPPETS.map(s => ({ ...s, createdAt: s.createdAt || now }));
  try {
    await chrome.storage.local.set({ [SNIPPETS_KEY]: seed });
    console.log('[SnipKit] Seed data written:', seed.length, 'snippets.');
    return seed;
  } catch (error) {
    console.error('[SnipKit] Error seeding default snippets:', error);
    return [];
  }
};

// ============================================================
// getAllSnippets (A-010)
// No longer auto-reseeds on empty. Seeding is exclusively the
// service worker's responsibility (onInstalled). An intentionally
// empty list stays empty.
// ============================================================
export const getAllSnippets = async () => {
  try {
    const data = await chrome.storage.local.get(SNIPPETS_KEY);
    return data[SNIPPETS_KEY] ?? [];
  } catch (error) {
    console.error('[SnipKit] Error getting all snippets:', error);
    return [];
  }
};

export const getSnippetByTrigger = async (trigger) => {
  try {
    const snippets = await getAllSnippets();
    const normalizedTrigger = trigger.toLowerCase();
    return snippets.find(s => s.trigger.toLowerCase() === normalizedTrigger) || null;
  } catch (error) {
    console.error('[SnipKit] Error getting snippet by trigger:', error);
    return null;
  }
};

export const saveSnippet = async (snippet) => {
  try {
    const snippets = await getAllSnippets();
    const index = snippets.findIndex(s => s.id === snippet.id);

    if (index >= 0) {
      snippets[index] = { ...snippets[index], ...snippet };
    } else {
      snippets.push({
        ...snippet,
        id: snippet.id || generateId(), // A-015
        usageCount: snippet.usageCount || 0,
        createdAt: snippet.createdAt || Date.now()
      });
    }

    await chrome.storage.local.set({ [SNIPPETS_KEY]: snippets });
  } catch (error) {
    console.error('[SnipKit] Error saving snippet:', error);
    throw error;
  }
};

export const deleteSnippet = async (id) => {
  try {
    let snippets = await getAllSnippets();
    snippets = snippets.filter(s => s.id !== id);
    await chrome.storage.local.set({ [SNIPPETS_KEY]: snippets });
  } catch (error) {
    console.error('[SnipKit] Error deleting snippet:', error);
    throw error;
  }
};

export const incrementUsage = async (id) => {
  try {
    const snippets = await getAllSnippets();
    const index = snippets.findIndex(s => s.id === id);
    if (index >= 0) {
      snippets[index].usageCount = (snippets[index].usageCount || 0) + 1;
      await chrome.storage.local.set({ [SNIPPETS_KEY]: snippets });
    }
  } catch (error) {
    console.error('[SnipKit] Error incrementing snippet usage:', error);
    throw error;
  }
};

export const exportData = async () => {
  try {
    const snippets = await getAllSnippets();
    return JSON.stringify(snippets, null, 2);
  } catch (error) {
    console.error('[SnipKit] Error exporting snippets:', error);
    throw error;
  }
};

export const importData = async (jsonStr) => {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      throw new Error('Import data must be an array of snippets');
    }

    const currentData = await chrome.storage.local.get(SNIPPETS_KEY);
    const currentSnippets = currentData[SNIPPETS_KEY] || [];
    const existingTriggers = new Set(currentSnippets.map(s => s.trigger.toLowerCase()));

    let importedCount = 0;
    let skippedCount = 0;
    const newSnippets = [...currentSnippets];

    for (const item of parsed) {
      if (
        !item.trigger || typeof item.trigger !== 'string' ||
        !item.expansion || typeof item.expansion !== 'string'
      ) {
        skippedCount++;
        continue;
      }

      const normalizedTrigger = item.trigger.toLowerCase();
      if (existingTriggers.has(normalizedTrigger)) {
        skippedCount++;
        continue;
      }

      newSnippets.push({
        ...item,
        id: item.id || generateId(), // A-015
        trigger: normalizedTrigger,
        usageCount: item.usageCount || 0,
        createdAt: item.createdAt || Date.now()
      });
      existingTriggers.add(normalizedTrigger);
      importedCount++;
    }

    await chrome.storage.local.set({ [SNIPPETS_KEY]: newSnippets });
    return { imported: importedCount, skipped: skippedCount };
  } catch (error) {
    console.error('[SnipKit] Error importing data:', error);
    throw error;
  }
};

export const getConfig = async () => {
  try {
    const data = await chrome.storage.local.get(CONFIG_KEY);
    return data[CONFIG_KEY] || { triggerPrefix: DEFAULT_PREFIX, pasteMethod: 'auto' };
  } catch (error) {
    console.error('[SnipKit] Error getting config:', error);
    return { triggerPrefix: DEFAULT_PREFIX, pasteMethod: 'auto' };
  }
};

export const saveConfig = async (config) => {
  try {
    const currentConfig = await getConfig();
    const newConfig = { ...currentConfig, ...config };
    await chrome.storage.local.set({ [CONFIG_KEY]: newConfig });
  } catch (error) {
    console.error('[SnipKit] Error saving config:', error);
    throw error;
  }
};
