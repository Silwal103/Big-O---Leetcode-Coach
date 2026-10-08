import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canRetry, isTypingTarget } from './keys.js'

test('isTypingTarget: text fields and editable elements count as typing', () => {
  assert.equal(isTypingTarget({ tagName: 'TEXTAREA' }), true)
  assert.equal(isTypingTarget({ tagName: 'INPUT', type: 'text' }), true)
  assert.equal(isTypingTarget({ tagName: 'SELECT' }), true)
  assert.equal(isTypingTarget({ tagName: 'DIV', isContentEditable: true }), true)
})

test('isTypingTarget: buttons, checkboxes and the page do not', () => {
  assert.equal(isTypingTarget({ tagName: 'BUTTON' }), false)
  assert.equal(isTypingTarget({ tagName: 'INPUT', type: 'checkbox' }), false)
  assert.equal(isTypingTarget({ tagName: 'BODY' }), false)
  assert.equal(isTypingTarget(null), false)
})

test('canRetry: only when the last message is an unanswered user message', () => {
  assert.equal(canRetry([{ role: 'ai' }, { role: 'user' }]), true)
  assert.equal(canRetry([{ role: 'user' }, { role: 'ai' }]), false)
  assert.equal(canRetry([]), false)
})
