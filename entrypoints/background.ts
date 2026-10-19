export default defineBackground(() => {
  console.log('[Frappe Vault] Background service worker initialized');

  // Handle messages from popup or content script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PING') {
      sendResponse({ status: 'OK' });
      return true;
    }
  });
});
