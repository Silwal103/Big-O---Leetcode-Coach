/**
 * Per-problem session store, persisted as one JSON blob in Web Storage.
 *
 * Pure helpers only — no React, no DOM. `storage` is passed in so the
 * module works with `localStorage` in the app and a stub in tests.
 */

const STORE_KEY = 'leetcode-coach-sessions'
const LEGACY_KEY = 'leetcode-coach-session'

export const EMPTY_CONTEXT = {
  title: '',
  description: '',
  constraints: '',
  examples: '',
  code: '',
  language: '',
  url: '',
}

/**
 * Derive the storage key for a problem context.
 *
 * @param {{ url?: string, title?: string }} context
 * @returns {string} The LeetCode slug, else a slugified title, else 'untitled'.
 */
export function sessionKeyFor({ url = '', title = '' } = {}) {
  const slug = url.match(/leetcode\.com\/problems\/([^/?#]+)/)?.[1]
  if (slug) return slug
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled'
}

function readJSON(storage, key) {
  try {
    return JSON.parse(storage.getItem(key))
  } catch {
    return null
  }
}

/**
 * Load the session store, migrating the legacy single-session key once.
 * Never throws: unreadable data yields an empty store.
 *
 * @param {Storage} storage
 * @returns {{ version: number, activeKey: string, sessions: Object<string, object> }}
 */
export function loadStore(storage) {
  const saved = readJSON(storage, STORE_KEY)
  let store = saved?.sessions && typeof saved.sessions === 'object'
    ? { version: 1, activeKey: saved.activeKey || 'untitled', sessions: saved.sessions }
    : { version: 1, activeKey: 'untitled', sessions: {} }

  const legacy = readJSON(storage, LEGACY_KEY)
  if (legacy && typeof legacy === 'object') {
    const key = sessionKeyFor(legacy.context || {})
    if (!store.sessions[key]) {
      store = upsertSession(store, key, {
        context: legacy.context || {},
        messages: Array.isArray(legacy.messages) ? legacy.messages : [],
        hintLevel: legacy.hintLevel || 0,
      })
    }
    // Drop the legacy copy only once the migrated store is safely written.
    if (saveStore(storage, store)) {
      try {
        storage.removeItem(LEGACY_KEY)
      } catch {
        // Harmless: migration is idempotent and will retry next load.
      }
    }
  }
  return store
}

/**
 * Persist the store.
 *
 * @param {Storage} storage
 * @param {object} store
 * @returns {boolean} false when the write failed (e.g. quota exceeded).
 */
export function saveStore(storage, store) {
  try {
    storage.setItem(STORE_KEY, JSON.stringify(store))
    return true
  } catch {
    return false
  }
}

/**
 * Return a new store with `data` merged into the session at `key`, made active.
 *
 * @param {object} store
 * @param {string} key
 * @param {{ context?: object, messages?: Array, hintLevel?: number }} data
 * @returns {object}
 */
export function upsertSession(store, key, data) {
  return {
    ...store,
    activeKey: key,
    sessions: {
      ...store.sessions,
      [key]: { ...store.sessions[key], ...data, updatedAt: Date.now() },
    },
  }
}

/**
 * The active session with defaults filled in.
 *
 * @param {object} store
 * @returns {{ context: object, messages: Array, hintLevel: number }}
 */
export function activeSession(store) {
  const session = store.sessions[store.activeKey] || {}
  return {
    context: { ...EMPTY_CONTEXT, ...session.context },
    messages: session.messages || [],
    hintLevel: session.hintLevel || 0,
  }
}
