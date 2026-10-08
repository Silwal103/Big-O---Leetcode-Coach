/**
 * Minimal Markdown + LaTeX-ish parser for tutor replies.
 *
 * Returns plain data (never HTML) so React renders everything as text nodes.
 * Supports: fenced code, headings, ordered/bulleted lists, paragraphs,
 * **bold**, *italic*, `code`, and $math$ mapped to Unicode.
 * ponytail: no nested lists, tables, links or blockquotes; add them if replies start using them.
 */

const SYMBOLS = {
  le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈', pm: '±',
  times: '×', cdot: '·', ldots: '…', dots: '…', cdots: '…',
  to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', iff: '⇔',
  infty: '∞', in: '∈', notin: '∉', sum: 'Σ', land: '∧', lor: '∨', oplus: '⊕',
  lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', sqrt: '√',
}
const SUPERSCRIPT = Object.fromEntries([...'0123456789+-=()nik'].map((c, i) => [c, '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱᵏ'[i]]))
const SUBSCRIPT = Object.fromEntries([...'0123456789+-=()ijknmx'].map((c, i) => [c, '₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ᵢⱼₖₙₘₓ'[i]]))

function script(chars, map, mark) {
  return [...chars].every(c => map[c]) ? [...chars].map(c => map[c]).join('') : `${mark}(${chars})`
}

/**
 * Turn the LaTeX the model commonly emits into readable Unicode text.
 *
 * @param {string} latex
 * @returns {string}
 */
export function latexToText(latex) {
  return latex
    .replace(/\\(?:text|mathrm|mathcal|mathbf|mathit|operatorname)\{([^{}]*)\}/g, '$1')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
    .replace(/\\([{}])/g, '$1')
    .replace(/\\[,;: ]/g, ' ')
    .replace(/\\([a-zA-Z]+)/g, (_, name) => SYMBOLS[name] ?? name)
    .replace(/\^\{([^{}]*)\}|\^(\w)/g, (_, group, single) => script(group ?? single, SUPERSCRIPT, '^'))
    .replace(/_\{([^{}]*)\}|_(\w)/g, (_, group, single) => script(group ?? single, SUBSCRIPT, '_'))
}

// Order matters: ** before *, $$ before $.
const INLINE = new RegExp([
  /`([^`\n]+)`/.source,
  /\$\$([^$]+?)\$\$/.source,
  /\$(?!\s)([^$\n]+?)(?<!\s)\$/.source,
  /\*\*(?!\s)(.+?)(?<!\s)\*\*/.source,
  /(?<!\w)__(?!\s)(.+?)(?<!\s)__(?!\w)/.source,
  /\*(?!\s)([^*\n]+?)(?<!\s)\*/.source,
  /(?<!\w)_(?!\s)([^_\n]+?)(?<!\s)_(?!\w)/.source,
].join('|'), 'g')

function pushText(tokens, value) {
  if (!value) return
  const last = tokens[tokens.length - 1]
  if (last?.type === 'text') last.value += value
  else tokens.push({ type: 'text', value })
}

/**
 * Split one block of text into inline tokens.
 *
 * @param {string} text
 * @returns {Array<{type: string, value?: string, children?: Array}>}
 */
export function parseInline(text) {
  const tokens = []
  let index = 0
  for (const match of text.matchAll(INLINE)) {
    pushText(tokens, text.slice(index, match.index))
    const [, code, display, math, strong, strongAlt, em, emAlt] = match
    if (code !== undefined) tokens.push({ type: 'code', value: code })
    else if (display !== undefined || math !== undefined) tokens.push({ type: 'math', value: latexToText((display ?? math).trim()) })
    else if (strong !== undefined || strongAlt !== undefined) tokens.push({ type: 'strong', children: parseInline(strong ?? strongAlt) })
    else tokens.push({ type: 'em', children: parseInline(em ?? emAlt) })
    index = match.index + match[0].length
  }
  pushText(tokens, text.slice(index))
  return tokens
}

const FENCE = /^\s*```\s*([\w+#.-]*)\s*$/
const HEADING = /^(#{1,6})\s+(.*)$/
const ORDERED = /^\s*(\d+)[.)]\s+(.*)$/
const BULLET = /^\s*[-*+]\s+(.*)$/

/**
 * Split a reply into blocks: code, heading, list, paragraph.
 *
 * @param {string} text
 * @returns {Array<object>}
 */
export function parseBlocks(text) {
  const blocks = []
  const lines = text.split('\n')
  let paragraph = []
  let list = null

  const flush = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', inlines: parseInline(paragraph.join('\n')) })
    if (list) blocks.push({ type: 'list', ordered: list.ordered, start: list.start, items: list.items.map(parseInline) })
    paragraph = []
    list = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const fence = line.match(FENCE)
    if (fence) {
      flush()
      const body = []
      while (++i < lines.length && !/^\s*```\s*$/.test(lines[i])) body.push(lines[i])
      blocks.push({ type: 'code', lang: fence[1], value: body.join('\n') })
      continue
    }
    if (!line.trim()) {
      flush()
      continue
    }
    const heading = line.match(HEADING)
    if (heading) {
      flush()
      blocks.push({ type: 'heading', level: heading[1].length, inlines: parseInline(heading[2]) })
      continue
    }
    const ordered = line.match(ORDERED)
    const bullet = !ordered && line.match(BULLET)
    if (ordered || bullet) {
      const isOrdered = Boolean(ordered)
      if (!list || list.ordered !== isOrdered) {
        flush()
        list = { ordered: isOrdered, start: isOrdered ? Number(ordered[1]) : 1, items: [] }
      }
      list.items.push(ordered ? ordered[2] : bullet[1])
      continue
    }
    if (list && /^\s/.test(line)) {
      list.items[list.items.length - 1] += ` ${line.trim()}`
      continue
    }
    if (list) flush()
    paragraph.push(line)
  }
  flush()
  return blocks
}
