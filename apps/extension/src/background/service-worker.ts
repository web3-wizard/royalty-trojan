import { PhantomWalletAdapter } from '../core/wallet-adapter/phantom.js';
import { BagsClient } from '../core/bags-client.js';
import type { WalletAdapter } from '../core/wallet-adapter/index.js';

type MessageSender = unknown;
type MessageResponse = { success: boolean; [key: string]: unknown };
type MessagePayload = {
  type: string;
  payload?: {
    recipient?: string;
    amount?: number;
    tier?: string;
    streamId?: string;
  };
};

const chrome = globalThis as typeof globalThis & {
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

chrome.runtime.onInstalled.addListener(() => {
  console.log('Royalty Trojan installed');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void sender;

  (async () => {
    switch (message.type) {
      case 'CONNECT_WALLET': {
        try {
          await wallet.connect();
          sendResponse({ success: true, publicKey: wallet.publicKey });
        } catch (error) {
          const messageText = error instanceof Error ? error.message : 'Failed to connect wallet';
          sendResponse({ success: false, error: messageText });
        }
        break;
      }

      case 'DISCONNECT_WALLET': {
        try {
          await wallet.disconnect();
          sendResponse({ success: true });
        } catch (error) {
          const messageText = error instanceof Error ? error.message : 'Failed to disconnect wallet';
          sendResponse({ success: false, error: messageText });
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

      case 'CREATE_STREAM': {
        try {
          const { recipient, amount, tier } = message.payload ?? {};

          if (!recipient || typeof amount !== 'number') {
            sendResponse({ success: false, error: 'Missing recipient or amount' });
            break;
          }

          if (!wallet.connected) {
            await wallet.connect();
          }

          const signature = await bagsClient.createStream(wallet, recipient, amount);
          sendResponse({ success: true, signature, tier });
        } catch (error) {
          const messageText = error instanceof Error ? error.message : 'Failed to create stream';
          sendResponse({ success: false, error: messageText });
        }
        break;
      }

      case 'CANCEL_STREAM': {
        try {
          const { streamId } = message.payload ?? {};
          if (!streamId) {
            sendResponse({ success: false, error: 'Missing streamId' });
            break;
          }

          if (!wallet.connected) {
            await wallet.connect();
          }

          const signature = await bagsClient.cancelStream(wallet, streamId);
          sendResponse({ success: true, signature });
        } catch (error) {
          const messageText = error instanceof Error ? error.message : 'Failed to cancel stream';
          sendResponse({ success: false, error: messageText });
        }
        break;
      }

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  })();

  return true;
});

console.log('Royalty Trojan background service worker running');