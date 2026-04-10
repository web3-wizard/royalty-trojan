type MessageSender = unknown;
type MessageResponse = { success: boolean };

declare const chrome: {
  runtime: {
    onInstalled: {
      addListener(listener: () => void): void;
    };
    onMessage: {
      addListener(
        listener: (
          message: unknown,
          sender: MessageSender,
          sendResponse: (response: MessageResponse) => void
        ) => boolean | void
      ): void;
    };
  };
};

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