import { PhantomWalletAdapter } from '../core/wallet-adapter/phantom.js';
import { BagsClient } from '../core/bags-client.js';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
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
    creatorWallet?: string;
    creatorName?: string;
    platform?: string;
    isLive?: boolean;
  };
};

declare const chrome: {
  action: {
    setBadgeText(details: { text: string }): void;
    setBadgeBackgroundColor(details: { color: string }): void;
  };
  alarms: {
    create(name: string, alarmInfo: { delayInMinutes?: number; periodInMinutes?: number }): void;
    clear(name: string): void;
    onAlarm: {
      addListener(listener: (alarm: { name: string }) => void): void;
    };
  };
  notifications: {
    create(
      notificationId: string,
      options: {
        type: 'basic';
        iconUrl: string;
        title: string;
        message: string;
        priority?: number;
      }
    ): void;
  };
  runtime: {
    onInstalled: {
      addListener(listener: () => void): void;
    };
    onStartup: {
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
const solanaConnection = new Connection(clusterApiUrl('mainnet-beta'));
const STREAM_CACHE_TTL_MS = 5 * 60 * 1000;
const BADGE_CHECK_ALARM = 'rt-low-balance-check';
const LOW_BALANCE_SOL_THRESHOLD = 0.05;
const LOW_BALANCE_NOTIFY_COOLDOWN_MS = 30 * 60 * 1000;
const LIVE_NOTIFY_COOLDOWN_MS = 30 * 60 * 1000;

type StreamCacheEntry = {
  expiresAt: number;
  streams: any[];
};

const streamListCache = new Map<string, StreamCacheEntry>();
const lowBalanceNotifyByWallet = new Map<string, number>();
const liveNotifyByCreator = new Map<string, number>();

function getStreamCacheKey(filter: { sender?: string; receiver?: string }): string {
  return JSON.stringify({
    sender: filter.sender ?? '',
    receiver: filter.receiver ?? '',
  });
}

function getCachedStreams(filter: { sender?: string; receiver?: string }): any[] | null {
  const key = getStreamCacheKey(filter);
  const entry = streamListCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    streamListCache.delete(key);
    return null;
  }
  return entry.streams;
}

function setCachedStreams(filter: { sender?: string; receiver?: string }, streams: any[]): void {
  streamListCache.set(getStreamCacheKey(filter), {
    streams,
    expiresAt: Date.now() + STREAM_CACHE_TTL_MS,
  });
}

function clearStreamCache(): void {
  streamListCache.clear();
}

function notify(title: string, message: string): void {
  chrome.notifications.create(`rt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, {
    type: 'basic',
    iconUrl: 'assets/icon128.png',
    title,
    message,
    priority: 1,
  });
}

function scheduleBalanceChecks(): void {
  chrome.alarms.clear(BADGE_CHECK_ALARM);
  if (!wallet.connected || !wallet.publicKey) return;
  chrome.alarms.create(BADGE_CHECK_ALARM, { delayInMinutes: 1, periodInMinutes: 5 });
}

async function checkLowBalanceAndNotify(): Promise<void> {
  if (!wallet.connected || !wallet.publicKey) return;

  try {
    const publicKey = new PublicKey(wallet.publicKey);
    const lamports = await solanaConnection.getBalance(publicKey);
    const solBalance = lamports / 1_000_000_000;
    if (solBalance >= LOW_BALANCE_SOL_THRESHOLD) return;

    const now = Date.now();
    const lastNotifiedAt = lowBalanceNotifyByWallet.get(wallet.publicKey) ?? 0;
    if (now - lastNotifiedAt < LOW_BALANCE_NOTIFY_COOLDOWN_MS) return;

    lowBalanceNotifyByWallet.set(wallet.publicKey, now);
    notify(
      'Low Wallet Balance',
      `Your wallet balance is ${solBalance.toFixed(3)} SOL. Top up soon to keep streams funded.`
    );
  } catch (error) {
    console.error('Failed low balance check:', error);
  }
}

async function maybeNotifyCreatorLive(
  creatorWallet: string,
  creatorName: string,
  platform: string,
  isLive: boolean
): Promise<void> {
  if (!isLive || !wallet.connected || !wallet.publicKey) return;

  try {
    const activeSupport = await bagsClient.listAllActiveStreams({
      sender: wallet.publicKey,
      receiver: creatorWallet,
    });

    if (activeSupport.length === 0) return;

    const dedupeKey = `${wallet.publicKey}:${creatorWallet}:${platform}`;
    const now = Date.now();
    const lastNotifiedAt = liveNotifyByCreator.get(dedupeKey) ?? 0;
    if (now - lastNotifiedAt < LIVE_NOTIFY_COOLDOWN_MS) return;

    liveNotifyByCreator.set(dedupeKey, now);
    notify('Creator Live Now', `${creatorName} just went live on ${platform}. You are currently supporting this creator.`);
  } catch (error) {
    console.error('Failed Twitch live support check:', error);
  }
}

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
  scheduleBalanceChecks();
});

chrome.runtime.onStartup.addListener(() => {
  void updateBadge();
  scheduleBalanceChecks();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === BADGE_CHECK_ALARM) {
    void checkLowBalanceAndNotify();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void sender;

  (async () => {
    try {
      switch (message.type) {
        case 'CONNECT_WALLET': {
          try {
            await wallet.connect();
            clearStreamCache();
            void updateBadge();
            scheduleBalanceChecks();
            void checkLowBalanceAndNotify();
            sendResponse({ success: true, publicKey: wallet.publicKey });
          } catch (error) {
            sendError(sendResponse, 'CONNECT_WALLET_FAILED', error, 'Failed to connect wallet');
          }
          break;
        }

        case 'DISCONNECT_WALLET': {
          try {
            await wallet.disconnect();
            clearStreamCache();
            void updateBadge();
            scheduleBalanceChecks();
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
            const filter = { sender, receiver };
            const cached = getCachedStreams(filter);
            if (cached) {
              sendResponse({ success: true, streams: cached, cached: true });
              break;
            }

            const streams = await bagsClient.listStreams(filter);
            setCachedStreams(filter, streams);
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
            clearStreamCache();
            void updateBadge();
            void checkLowBalanceAndNotify();
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
            clearStreamCache();
            void updateBadge();
            sendResponse({ success: true, signature });
          } catch (error) {
            sendError(sendResponse, 'CANCEL_STREAM_FAILED', error, 'Failed to cancel stream');
          }
          break;
        }

        case 'CREATOR_LIVE_STATUS': {
          try {
            const { creatorWallet, creatorName, platform, isLive } = message.payload ?? {};
            if (!creatorWallet || !creatorName || !platform || typeof isLive !== 'boolean') {
              sendError(sendResponse, 'INVALID_CREATOR_LIVE_PAYLOAD', null, 'Missing live status payload values');
              break;
            }

            await maybeNotifyCreatorLive(creatorWallet, creatorName, platform, isLive);
            sendResponse({ success: true });
          } catch (error) {
            sendError(sendResponse, 'CREATOR_LIVE_STATUS_FAILED', error, 'Failed to process creator live event');
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