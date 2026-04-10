// Minimal background script for future message passing
chrome.runtime.onInstalled.addListener(() => {
  console.log('Royalty Trojan installed');
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Will handle identity resolution requests later
  sendResponse({ success: true });
  return true;
});