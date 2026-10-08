import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const source = readFileSync(new URL('../public/content-script.js', import.meta.url), 'utf8')

/** Run content-script.js against a fake DOM and return what it sends back. */
function extract({ viewLines = [], elements = {} }) {
  let listener
  const context = {
    window: { location: { href: 'https://leetcode.com/problems/two-sum/' } },
    document: {
      querySelector: selector => elements[selector] || null,
      querySelectorAll: selector => (selector === '.monaco-editor .view-line' ? viewLines : []),
    },
    chrome: { runtime: { onMessage: { addListener: fn => { listener = fn } } } },
  }
  vm.runInNewContext(source, context)
  let response
  listener({ type: 'extract-context' }, {}, value => { response = value })
  return response
}

const line = (top, text) => ({ style: { top: `${top}px` }, textContent: text })

test('Monaco code keeps line breaks, line order and indentation', () => {
  // Monaco positions lines absolutely, so DOM order is not line order; spaces render as NBSP.
  const viewLines = [
    line(19, '    def twoSum(self, nums, target):'),
    line(0, 'class Solution:'),
    line(38, '        pass'),
  ]
  assert.equal(
    extract({ viewLines }).code,
    'class Solution:\n    def twoSum(self, nums, target):\n        pass',
  )
})

test('falls back to the old selectors when Monaco is absent', () => {
  const code = extract({ elements: { '.CodeMirror-code': { textContent: 'return 1' } } }).code
  assert.equal(code, 'return 1')
})

test('title still comes from .text-title-large', () => {
  const result = extract({ elements: { '.text-title-large': { textContent: ' 1. Two Sum ' } } })
  assert.equal(result.title, '1. Two Sum')
  assert.equal(result.url, 'https://leetcode.com/problems/two-sum/')
})
