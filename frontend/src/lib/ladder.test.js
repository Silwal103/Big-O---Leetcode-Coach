import { test } from 'node:test'
import assert from 'node:assert/strict'
import { STEPS, complexityLabel, complexityTone, correctnessTone, ladderCaption, nextHintMode, stepForLevel } from './ladder.js'

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

test('STEPS map the backend hint_level scale 1-5', () => {
  assert.deepEqual(STEPS.map(step => [step.level, step.label]), [
    [1, 'Nudge'], [2, 'Hint'], [3, 'Approach'], [4, 'Pseudocode'], [5, 'Solution'],
  ])
})

test('stepForLevel: no step before the first hint', () => {
  assert.equal(stepForLevel(0), null)
  assert.equal(stepForLevel(1).label, 'Nudge')
  assert.equal(stepForLevel(4).label, 'Pseudocode')
  assert.equal(stepForLevel(5).label, 'Solution')
  assert.equal(stepForLevel(undefined), null)
})

test('nextHintMode: hint for the first two steps, stronger_hint after', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(nextHintMode), ['hint', 'hint', 'stronger_hint', 'stronger_hint', 'stronger_hint'])
})

test('ladderCaption never points at the step the user is already on', () => {
  assert.equal(ladderCaption(0), 'Next: Nudge · 0/5')
  assert.equal(ladderCaption(3), 'Next: Pseudocode · 3/5')
  assert.equal(ladderCaption(4), 'Solution needs confirmation · 4/5')
  assert.equal(ladderCaption(5), 'Solution revealed')
})
