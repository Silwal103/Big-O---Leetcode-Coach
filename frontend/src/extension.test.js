import { test } from 'node:test'
import assert from 'node:assert/strict'

// extension.js reads globalThis.chrome at import time, so install the fake first.
const calls = []
let failuresLeft = 0
let failureMessage = ''
globalThis.chrome = {
  runtime: { id: 'test-extension', lastError: undefined },
  tabs: {
    query: async () => [{ id: 7, url: 'https://leetcode.com/problems/two-sum/' }],
    sendMessage(tabId, message, callback) {
      calls.push(['sendMessage', tabId])
      if (failuresLeft > 0) {
        failuresLeft -= 1
        chrome.runtime.lastError = { message: failureMessage }
        callback(undefined)
        chrome.runtime.lastError = undefined
        return
      }
      callback({ title: 'Two Sum', url: 'https://leetcode.com/problems/two-sum/' })
    },
  },
  scripting: {
    executeScript: async ({ target, files }) => {
      calls.push(['executeScript', target.tabId, files[0]])
    },
  },
}
const { getActiveTabContext } = await import('./extension.js')

test('injects the content script and retries when the tab has no live receiver', async () => {
  calls.length = 0
  failuresLeft = 1
  failureMessage = 'Could not establish connection. Receiving end does not exist.'

  const context = await getActiveTabContext()
  assert.equal(context.title, 'Two Sum')
  assert.deepEqual(calls, [
    ['sendMessage', 7],
    ['executeScript', 7, 'content-script.js'],
    ['sendMessage', 7],
  ])
})

test('other messaging errors are not retried', async () => {
  calls.length = 0
  failuresLeft = 1
  failureMessage = 'The tab was closed.'

  await assert.rejects(getActiveTabContext(), /The tab was closed/)
  assert.deepEqual(calls, [['sendMessage', 7]])
})
