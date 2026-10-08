import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mascotState, thinkingLines } from './mascot.js'

const hintReply = { role: 'ai', hintLevel: 2, revealsSolution: false }
const goodReview = { role: 'ai', hintLevel: 0, correctness: 'Correct' }
const badReview = { role: 'ai', hintLevel: 0, correctness: 'Incorrect: misses empty input' }

test('mascotState: loading wins, review requests read as analyzing', () => {
  assert.equal(mascotState({ loading: true, mode: 'hint' }), 'thinking')
  assert.equal(mascotState({ loading: true, mode: 'review_approach' }), 'analyzing')
  assert.equal(mascotState({ loading: true, mode: 'chat', error: 'x' }), 'thinking')
})

test('mascotState: errors show confusion', () => {
  assert.equal(mascotState({ loading: false, error: 'Cannot reach the backend.' }), 'error')
})

test('mascotState: fresh replies flash hint or success, then settle to idle', () => {
  assert.equal(mascotState({ recent: true, lastMessage: hintReply }), 'hint')
  assert.equal(mascotState({ recent: true, lastMessage: goodReview }), 'success')
  assert.equal(mascotState({ recent: true, lastMessage: badReview }), 'idle')
  assert.equal(mascotState({ recent: false, lastMessage: hintReply }), 'idle')
  assert.equal(mascotState({ recent: true, lastMessage: { ...hintReply, revealsSolution: true } }), 'idle')
  assert.equal(mascotState({}), 'idle')
})

test('thinkingLines: two lines per mode, chat as the fallback', () => {
  for (const mode of ['hint', 'stronger_hint', 'explain_concept', 'review_approach', 'show_solution', 'chat']) {
    assert.equal(thinkingLines(mode).length, 2, mode)
  }
  assert.deepEqual(thinkingLines('unknown'), thinkingLines('chat'))
  assert.match(thinkingLines('review_approach')[0], /code/i)
})
