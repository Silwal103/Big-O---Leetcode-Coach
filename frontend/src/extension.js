export const isExtension = Boolean(globalThis.chrome?.runtime?.id)

export async function getActiveTabContext() {
  if (!isExtension) {
    return { title: '', description: '', constraints: '', examples: '', code: '', language: '', url: '' }
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !tab.url?.includes('leetcode.com')) {
    return { title: '', description: '', constraints: '', examples: '', code: '', language: '', url: tab?.url || '' }
  }

  try {
    return await requestContext(tab.id)
  } catch (err) {
    // Tabs opened before the extension was installed or reloaded have no live content script.
    if (!err.message.includes('Receiving end does not exist')) throw err
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content-script.js'] })
    return requestContext(tab.id)
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
