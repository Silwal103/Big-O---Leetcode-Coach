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
    'h1.text-title-large',
    'h1',
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
