function textFromSelectors(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector)
    if (element?.textContent?.trim()) {
      return element.textContent.trim()
    }
  }
  return ''
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

  const code = textFromSelectors([
    '.monaco-editor .view-lines',
    '.CodeMirror-code',
    '[contenteditable="true"]',
  ])

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
