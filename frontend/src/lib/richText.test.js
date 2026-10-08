import { test } from 'node:test'
import assert from 'node:assert/strict'
import { latexToText, parseBlocks, parseInline } from './richText.js'

test('parseInline: bold, italic, code and math', () => {
  assert.deepEqual(parseInline('a **b** c'), [
    { type: 'text', value: 'a ' },
    { type: 'strong', children: [{ type: 'text', value: 'b' }] },
    { type: 'text', value: ' c' },
  ])
  assert.deepEqual(parseInline('*don\'t*'), [{ type: 'em', children: [{ type: 'text', value: 'don\'t' }] }])
  assert.deepEqual(parseInline('use `nums[i]` here'), [
    { type: 'text', value: 'use ' },
    { type: 'code', value: 'nums[i]' },
    { type: 'text', value: ' here' },
  ])
  assert.deepEqual(parseInline('$n \\le 100$'), [{ type: 'math', value: 'n ≤ 100' }])
})

test('parseInline: snake_case, lone stars and prices stay text', () => {
  assert.deepEqual(parseInline('call two_sum_fast now'), [{ type: 'text', value: 'call two_sum_fast now' }])
  assert.deepEqual(parseInline('a * b * c'), [{ type: 'text', value: 'a * b * c' }])
  assert.deepEqual(parseInline('costs $5 and $10'), [{ type: 'text', value: 'costs $5 and $10' }])
})

test('parseInline: bold can contain math', () => {
  assert.deepEqual(parseInline('**if $a < b$**'), [
    { type: 'strong', children: [{ type: 'text', value: 'if ' }, { type: 'math', value: 'a < b' }] },
  ])
})

test('latexToText: common DSA notation', () => {
  assert.equal(latexToText('[a, b]'), '[a, b]')
  assert.equal(latexToText('O(n^2)'), 'O(n²)')
  assert.equal(latexToText('O(n \\log n)'), 'O(n log n)')
  assert.equal(latexToText('x_i \\neq x_{j}'), 'xᵢ ≠ xⱼ')
  assert.equal(latexToText('\\mathcal{O}(2^{n})'), 'O(2ⁿ)')
  assert.equal(latexToText('\\frac{n}{2} \\times k'), 'n/2 × k')
  assert.equal(latexToText('10^{9} + 7'), '10⁹ + 7')
  assert.equal(latexToText('2^{n+1}'), '2ⁿ⁺¹')
  assert.equal(latexToText('x^{ab}'), 'x^(ab)')
})

test('parseBlocks: the reported tutor reply', () => {
  const reply = [
    'It looks like your code template is currently empty!',
    '',
    'Before we start, two things:',
    '',
    '1. **The Overlap Condition:** If we have $[a, b]$ and $[c, d]$, how do they overlap?',
    '2. **The Overall Strategy:** Since $n \\le 100$ is very small, brute force works.',
  ].join('\n')
  const blocks = parseBlocks(reply)
  assert.deepEqual(blocks.map(b => b.type), ['paragraph', 'paragraph', 'list'])
  assert.equal(blocks[2].ordered, true)
  assert.equal(blocks[2].start, 1)
  assert.equal(blocks[2].items.length, 2)
  assert.deepEqual(blocks[2].items[1][0], {
    type: 'strong', children: [{ type: 'text', value: 'The Overall Strategy:' }],
  })
  assert.ok(blocks[2].items[1].some(t => t.type === 'math' && t.value === 'n ≤ 100'))
})

test('parseBlocks: fenced code with and without language, and unclosed fences', () => {
  assert.deepEqual(parseBlocks('```python\ndef f():\n    return 1\n```'), [
    { type: 'code', lang: 'python', value: 'def f():\n    return 1' },
  ])
  assert.deepEqual(parseBlocks('```\nx = 1\n```\nafter'), [
    { type: 'code', lang: '', value: 'x = 1' },
    { type: 'paragraph', inlines: [{ type: 'text', value: 'after' }] },
  ])
  assert.deepEqual(parseBlocks('```js\nlet a = 1'), [{ type: 'code', lang: 'js', value: 'let a = 1' }])
})

test('parseBlocks: headings, bullets, and list item continuation lines', () => {
  const blocks = parseBlocks('## Approach\n- first\n  still first\n* second')
  assert.equal(blocks[0].type, 'heading')
  assert.equal(blocks[0].level, 2)
  assert.equal(blocks[1].ordered, false)
  assert.deepEqual(blocks[1].items[0], [{ type: 'text', value: 'first still first' }])
  assert.equal(blocks[1].items.length, 2)
})

test('parseBlocks: HTML-looking input stays literal text', () => {
  assert.deepEqual(parseBlocks('<script>alert(1)</script> <b>x</b>'), [
    { type: 'paragraph', inlines: [{ type: 'text', value: '<script>alert(1)</script> <b>x</b>' }] },
  ])
  assert.deepEqual(parseBlocks(''), [])
})
