function textFromSelectors(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector)
    if (element?.textContent?.trim()) {
      return element.textContent.trim()
    }
  }
  return ''
}

function editorCode() {
  // Monaco renders each line as an absolutely positioned .view-line (DOM order != line order)
  // and draws spaces as NBSP, so join the lines ourselves instead of reading one textContent.
  // ponytail: Monaco only renders lines near the viewport; very long code scrolled out of view
  // is cut. Upgrade path: read monaco.editor.getModels() via chrome.scripting in the MAIN world.
  const lines = [...document.querySelectorAll('.monaco-editor .view-line')]
  if (lines.length) {
    return lines
      .sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top))
      .map(line => line.textContent.replace(/\u00a0/g, ' '))
      .join('\n')
      .trimEnd()
  }
  return textFromSelectors(['.CodeMirror-code', '[contenteditable="true"]'])
}

function extractLeetCodeContext() {
  const title = textFromSelectors([
    '[data-cy="question-title"]',
    // Current UI renders the title in a non-h1 element; a bare 'h1' fallback picked up unrelated headings.
    '.text-title-large',
  ])

  const description = textFromSelectors([
    '[data-track-load="description_content"]',
    '[data-cy="question-content"]',
    '.elfjS',
  ])

  const code = editorCode()

  return {
    title,
    description,
    constraints: '',
    examples: '',
    code,
    language: '',
    url: window.location.href,
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'extract-context') {
    sendResponse(extractLeetCodeContext())
  }
  return true
})
