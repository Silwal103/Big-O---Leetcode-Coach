export const isExtension = Boolean(globalThis.chrome?.runtime?.id)

// Exact host match: a substring check would also accept e.g. evil.example/?next=leetcode.com,
// and the fallback below injects the content script into whatever tab passes this check.
function isLeetCodeUrl(url) {
  try {
    return new URL(url).hostname === 'leetcode.com'
  } catch {
    return false
  }
}

export async function getActiveTabContext() {
  if (!isExtension) {
    return { title: '', description: '', constraints: '', examples: '', code: '', language: '', url: '' }
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !isLeetCodeUrl(tab.url)) {
    return { title: '', description: '', constraints: '', examples: '', code: '', language: '', url: tab?.url || '' }
  }

  let context
  try {
    context = await requestContext(tab.id)
  } catch (err) {
    // Tabs opened before the extension was installed or reloaded have no live content script.
    if (!err.message.includes('Receiving end does not exist')) throw err
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content-script.js'] })
    context = await requestContext(tab.id)
  }
  const code = await fullEditorCode(tab.id)
  return code ? { ...context, code } : context
}

// Monaco only renders lines near the viewport, so the content script's DOM scrape misses the rest.
// The editor model holds the whole file but lives in the page's own JS world.
async function fullEditorCode(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        const { editor } = globalThis.monaco ?? {}
        return (editor?.getEditors?.()[0]?.getModel() ?? editor?.getModels()[0])?.getValue()
      },
    })
    return typeof result?.result === 'string' ? result.result.trimEnd() : ''
  } catch {
    return '' // fall back to the DOM scrape
  }
}

function requestContext(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: 'extract-context' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve(response || {})
    })
  })
}
