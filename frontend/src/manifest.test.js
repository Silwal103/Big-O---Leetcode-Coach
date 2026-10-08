import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const publicDir = new URL('../public/', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('manifest.json', publicDir), 'utf8'))

/** Width and height from a PNG's IHDR chunk. */
function pngSize(path) {
  const bytes = readFileSync(new URL(path, publicDir))
  assert.equal(bytes.toString('ascii', 1, 4), 'PNG', `${path} is not a PNG`)
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)]
}

test('manifest is named Big-O and declares icons at every required size', () => {
  assert.equal(manifest.name, 'Big-O')
  assert.deepEqual(Object.keys(manifest.icons ?? {}), ['16', '32', '48', '128'])
  assert.deepEqual(manifest.action.default_icon, manifest.icons)
})

test('every declared icon is a PNG of its declared size', () => {
  for (const [size, path] of Object.entries(manifest.icons ?? {})) {
    assert.deepEqual(pngSize(path), [Number(size), Number(size)], path)
  }
})
