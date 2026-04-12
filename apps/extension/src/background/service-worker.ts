import { PhantomWalletAdapter } from '../core/wallet-adapter/phantom.js';
import { BagsClient } from '../core/bags-client.js';
import type { WalletAdapter } from '../core/wallet-adapter/index.js';

type MessageSender = unknown;
type StructuredError = {
  code: string;
  message: string;
  details?: unknown;
};

type MessageResponse = {
  success: boolean;
  error?: StructuredError;
  [key: string]: unknown;
};
type MessagePayload = {
  type: string;
  payload?: {
    recipient?: string;
    amount?: number;
    tier?: string;
    streamId?: string;
    sender?: string;
    receiver?: string;
  };
};

declare const chrome: {
  action: {
    setBadgeText(details: { text: string }): void;
    setBadgeBackgroundColor(details: { color: string }): void;
  };
  runtime: {
    onInstalled: {
      addListener(listener: () => void): void;
    };
    onMessage: {
      addListener(
        listener: (
          message: MessagePayload,
          sender: MessageSender,
          sendResponse: (response: MessageResponse) => void
        ) => boolean | void
      ): void;
    };
  };
};

let wallet: WalletAdapter = new PhantomWalletAdapter();
const bagsClient = new BagsClient();

async function updateBadge(): Promise<void> {
  try {
    if (!wallet.connected || !wallet.publicKey) {
      chrome.action.setBadgeText({ text: 'x' });
      chrome.action.setBadgeBackgroundColor({ color: '#6b7280' });
      return;
    }

    const streams = await bagsClient.listAllActiveStreams({ sender: wallet.publicKey });
    const count = streams.length;
    chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' });
  } catch (error) {
    console.error('Failed to update stream badge:', error);
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#c13f36' });
  }
}

function toStructuredError(error: unknown, fallbackMessage: string, code: string): StructuredError {
  if (error instanceof Error) {
    return {
      code,
      message: error.message || fallbackMessage,
      details: error.stack,
    };
  }

  return {
    code,
    message: fallbackMessage,
    details: error,
  };
}

function sendError(
  sendResponse: (response: MessageResponse) => void,
  code: string,
  error: unknown,
  fallbackMessage: string
) {
  sendResponse({
    success: false,
    error: toStructuredError(error, fallbackMessage, code),
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Royalty Trojan installed');
  void updateBadge();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void sender;

  (async () => {
    try {
      switch (message.type) {
        case 'CONNECT_WALLET': {
          try {
            await wallet.connect();
            void updateBadge();
            sendResponse({ success: true, publicKey: wallet.publicKey });
          } catch (error) {
            sendError(sendResponse, 'CONNECT_WALLET_FAILED', error, 'Failed to connect wallet');
          }
          break;
        }

        case 'DISCONNECT_WALLET': {
          try {
            await wallet.disconnect();
            void updateBadge();
            sendResponse({ success: true });
          } catch (error) {
            sendError(sendResponse, 'DISCONNECT_WALLET_FAILED', error, 'Failed to disconnect wallet');
          }
          break;
        }

        case 'GET_WALLET_STATUS': {
          sendResponse({
            success: true,
            connected: wallet.connected,
            publicKey: wallet.publicKey,
            ready: wallet.ready,
          });
          break;
        }

        case 'GET_ALL_STREAMS': {
          try {
            const { sender, receiver } = message.payload ?? {};
            const streams = await bagsClient.listStreams({ sender, receiver });
            sendResponse({ success: true, streams });
          } catch (error) {
            sendError(sendResponse, 'GET_ALL_STREAMS_FAILED', error, 'Failed to fetch streams');
          }
          break;
        }

        case 'CREATE_STREAM': {
          try {
            const { recipient, amount, tier } = message.payload ?? {};

            if (!recipient || typeof amount !== 'number') {
              sendError(sendResponse, 'INVALID_CREATE_STREAM_PAYLOAD', null, 'Missing recipient or amount');
              break;
            }

            if (!wallet.connected) {
              await wallet.connect();
            }

            const signature = await bagsClient.createStream(wallet, recipient, amount);
            void updateBadge();
            sendResponse({ success: true, signature, tier });
          } catch (error) {
            sendError(sendResponse, 'CREATE_STREAM_FAILED', error, 'Failed to create stream');
          }
          break;
        }

        case 'CANCEL_STREAM': {
          try {
            const { streamId } = message.payload ?? {};
            if (!streamId) {
              sendError(sendResponse, 'INVALID_CANCEL_STREAM_PAYLOAD', null, 'Missing streamId');
              break;
            }

            if (!wallet.connected) {
              await wallet.connect();
            }

            const signature = await bagsClient.cancelStream(wallet, streamId);
            void updateBadge();
            sendResponse({ success: true, signature });
          } catch (error) {
            sendError(sendResponse, 'CANCEL_STREAM_FAILED', error, 'Failed to cancel stream');
          }
          break;
        }

        default:
          sendError(sendResponse, 'UNKNOWN_MESSAGE_TYPE', null, 'Unknown message type');
      }
    } catch (error) {
      sendError(sendResponse, 'BACKGROUND_UNHANDLED_ERROR', error, 'Unexpected background error');
    }
  })();

  return true;
});

console.log('Royalty Trojan background service worker running');
void updateBadge();