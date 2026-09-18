export const isExtension = Boolean(globalThis.chrome?.runtime?.id)

export async function getActiveTabContext() {
  if (!isExtension) {
    return { title: '', description: '', constraints: '', examples: '', code: '', language: '', url: '' }
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !tab.url?.includes('leetcode.com')) {
    return { title: '', description: '', constraints: '', examples: '', code: '', language: '', url: tab?.url || '' }
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, { type: 'extract-context' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve(response || {})
    })
  })
}
