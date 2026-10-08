import { test } from 'node:test'
import assert from 'node:assert/strict'
import { complexityLabel, complexityTone, correctnessTone } from './ladder.js'

test('complexityTone follows the SPEC colour scale', () => {
  const cases = {
    'O(1)': 'ok',
    'O(log n)': 'ok',
    'O(N)': 'accent',
    'O(n log n)': 'warn',
    'O(n log(n))': 'warn',
    'O(n^2)': 'danger',
    'O(n²)': 'danger',
    'O(n^3)': 'danger',
    'O(2^n)': 'danger',
    'O(n!)': 'danger',
    'O(n * m)': 'neutral',
    'O(n + m)': 'neutral',
    'linear': 'neutral',
    '': 'neutral',
  }
  for (const [input, tone] of Object.entries(cases)) {
    assert.equal(complexityTone(input), tone, input)
  }
  assert.equal(complexityTone(undefined), 'neutral')
})

test('complexityTone reads the first O(...) inside a sentence', () => {
  assert.equal(complexityTone('O(n) — one pass over the array'), 'accent')
  assert.equal(complexityTone('Quadratic: O(n^2) because of the nested loop'), 'danger')
})

test('complexityLabel shows just the O(...) when present', () => {
  assert.equal(complexityLabel('O(n) where n is the length of nums'), 'O(n)')
  assert.equal(complexityLabel('O(n log(n)) due to sorting'), 'O(n log(n))')
  assert.equal(complexityLabel('linear'), 'linear')
})

test('correctnessTone: positive verdicts are ok, everything else warns', () => {
  assert.equal(correctnessTone('Correct'), 'ok')
  assert.equal(correctnessTone('Correct for all cases.'), 'ok')
  assert.equal(correctnessTone('Incorrect: fails on empty input'), 'warn')
  assert.equal(correctnessTone('Not correct yet'), 'warn')
  assert.equal(correctnessTone('Partially correct'), 'warn')
  assert.equal(correctnessTone('Mostly correct, but misses duplicates'), 'warn')
})
