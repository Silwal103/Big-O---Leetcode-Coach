import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  EMPTY_CONTEXT,
  loadStore,
  saveStore,
  sessionFor,
  sessionKeyFor,
  sessionKeyForImport,
  upsertSession,
} from './sessions.js'

function memoryStorage(entries = {}) {
  const map = new Map(Object.entries(entries))
  return {
    map,
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
  }
}

test('sessionKeyFor uses the LeetCode slug across URL variants', () => {
  for (const url of [
    'https://leetcode.com/problems/two-sum/',
    'https://leetcode.com/problems/two-sum/description/',
    'https://leetcode.com/problems/two-sum?envType=study-plan',
    'https://leetcode.com/problems/two-sum',
    'https://leetcode.com/problems/two-sum#top',
  ]) {
    assert.equal(sessionKeyFor({ url, title: 'ignored' }), 'two-sum', url)
  }
})

test('sessionKeyFor falls back to slugified title, then untitled', () => {
  assert.equal(sessionKeyFor({ url: '', title: '  1. Two Sum!  ' }), '1-two-sum')
  assert.equal(sessionKeyFor({ url: 'https://example.com', title: 'Valid Parentheses' }), 'valid-parentheses')
  assert.equal(sessionKeyFor({ url: '', title: '' }), 'untitled')
  assert.equal(sessionKeyFor({}), 'untitled')
})

test('loadStore returns an empty store when nothing is saved', () => {
  const store = loadStore(memoryStorage())
  assert.equal(store.activeKey, 'untitled')
  assert.deepEqual(store.sessions, {})
  assert.deepEqual(sessionFor(store), { context: EMPTY_CONTEXT, messages: [], hintLevel: 0 })
})

test('loadStore survives corrupt JSON and a throwing storage', () => {
  const corrupt = memoryStorage({ 'leetcode-coach-sessions': '{nope', 'leetcode-coach-session': '{nope' })
  assert.deepEqual(loadStore(corrupt).sessions, {})

  const throwing = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') }, removeItem() {} }
  assert.deepEqual(loadStore(throwing).sessions, {})
})

test('loadStore migrates the legacy single session and removes the legacy key', () => {
  const legacy = {
    messages: [{ role: 'user', content: 'hint please' }],
    context: { title: 'Two Sum', url: 'https://leetcode.com/problems/two-sum/description/' },
    hintLevel: 2,
  }
  const storage = memoryStorage({ 'leetcode-coach-session': JSON.stringify(legacy) })

  const store = loadStore(storage)
  assert.equal(store.activeKey, 'two-sum')
  const session = sessionFor(store)
  assert.deepEqual(session.messages, legacy.messages)
  assert.equal(session.hintLevel, 2)
  assert.equal(session.context.title, 'Two Sum')
  assert.equal(session.context.code, '')
  assert.equal(storage.map.has('leetcode-coach-session'), false)
  assert.deepEqual(JSON.parse(storage.map.get('leetcode-coach-sessions')).sessions['two-sum'].messages, legacy.messages)
})

test('loadStore keeps the legacy key when the migrated store cannot be saved', () => {
  const legacy = JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], context: {}, hintLevel: 0 })
  const storage = memoryStorage({ 'leetcode-coach-session': legacy })
  storage.setItem = () => { throw new Error('QuotaExceededError') }

  const store = loadStore(storage)
  assert.equal(sessionFor(store).messages.length, 1)
  assert.equal(storage.map.get('leetcode-coach-session'), legacy)
})

test('saveStore returns false instead of throwing on quota errors', () => {
  const storage = memoryStorage()
  storage.setItem = () => { throw new Error('QuotaExceededError') }
  assert.equal(saveStore(storage, loadStore(memoryStorage())), false)
})

test('upsertSession round-trips through save and load without touching other sessions', () => {
  const storage = memoryStorage()
  let store = loadStore(storage)
  store = upsertSession(store, 'two-sum', { messages: [{ role: 'user', content: 'a' }], hintLevel: 2 })
  store = upsertSession(store, 'valid-parentheses', { messages: [], hintLevel: 0 })
  assert.equal(saveStore(storage, store), true)

  const reloaded = loadStore(storage)
  assert.equal(reloaded.activeKey, 'valid-parentheses')
  assert.equal(reloaded.sessions['two-sum'].hintLevel, 2)
  assert.equal(reloaded.sessions['two-sum'].messages[0].content, 'a')
  assert.equal(typeof reloaded.sessions['two-sum'].updatedAt, 'number')
})

test('sessionKeyForImport switches only when the import found a problem', () => {
  const twoSum = { title: 'Two Sum', url: 'https://leetcode.com/problems/two-sum/description/' }
  assert.equal(sessionKeyForImport('valid-parentheses', twoSum), 'two-sum')
  assert.equal(sessionKeyForImport('two-sum', twoSum), 'two-sum')
  // Non-LeetCode tab or web-app mode: nothing imported, stay put.
  assert.equal(sessionKeyForImport('two-sum', { url: 'https://example.com' }), 'two-sum')
  assert.equal(sessionKeyForImport('two-sum', {}), 'two-sum')
})

test('sessionFor restores a saved problem and gives a blank session for a new one', () => {
  let store = loadStore(memoryStorage())
  store = upsertSession(store, 'two-sum', { messages: [{ role: 'ai', content: 'hint' }], hintLevel: 2, context: { title: 'Two Sum' } })
  store = upsertSession(store, 'valid-parentheses', { messages: [], hintLevel: 0 })

  const back = sessionFor(store, 'two-sum')
  assert.equal(back.hintLevel, 2)
  assert.equal(back.messages[0].content, 'hint')
  assert.equal(back.context.title, 'Two Sum')
  assert.deepEqual(sessionFor(store, 'climbing-stairs'), { context: EMPTY_CONTEXT, messages: [], hintLevel: 0 })
})
