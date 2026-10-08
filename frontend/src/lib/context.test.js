import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LANGUAGES, contextSummary, isContextEmpty } from './context.js'

test('isContextEmpty ignores whitespace and the url', () => {
  assert.equal(isContextEmpty({ title: '', description: ' ', code: '', url: 'https://leetcode.com/' }), true)
  assert.equal(isContextEmpty({ title: 'Two Sum' }), false)
  assert.equal(isContextEmpty({ code: 'return 1' }), false)
})

test('contextSummary prompts when nothing is filled in', () => {
  assert.equal(contextSummary({ title: '', code: '', language: '' }), 'Add problem details')
})

test('contextSummary lists language label and code size', () => {
  assert.equal(contextSummary({ title: 'Two Sum', language: 'java', code: 'a\nb\nc' }), 'Java · 3 lines')
  assert.equal(contextSummary({ title: 'Two Sum', language: 'cpp', code: '' }), 'C++')
  // Imported Monaco code arrives on one line, so don't claim "1 line".
  assert.equal(contextSummary({ title: 'Two Sum', language: '', code: 'class Solution {}' }), 'Code added')
  assert.equal(contextSummary({ title: 'Two Sum', language: '', code: '' }), 'Problem details')
})

test('LANGUAGES keeps the existing select values', () => {
  assert.deepEqual(LANGUAGES.map(l => l.value), ['python', 'java', 'cpp', 'javascript'])
})
