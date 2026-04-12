import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Settings } from './components/Settings.js';
import './styles.css';

type Tier = {
  name: string;
  amount: number;
};

type WalletState = {
  connected: boolean;
  publicKey: string | null;
};

type StreamStats = {
  active: number;
  paused: number;
  totalSpentThisMonth: number;
};

type CreatorInfo = {
  name: string;
  wallet: string;
};

type CreatorResolutionResponse = {
  success?: boolean;
  wallet?: string | null;
};

type MessageResponse = {
  success?: boolean;
  connected?: boolean;
  publicKey?: string | null;
  active?: number;
  paused?: number;
  totalSpentThisMonth?: number;
  creator?: CreatorInfo;
  error?: string;
};

type ChromeTab = { id?: number; url?: string };

const DEFAULT_TIERS: Tier[] = [
  { name: 'Tip Jar', amount: 5 },
  { name: 'Supporter', amount: 10 },
  { name: 'Patron', amount: 20 },
];

const chromeGlobal = globalThis as typeof globalThis & {
  chrome: {
    runtime: {
      lastError?: { message?: string };
      sendMessage(
        message: { type: string; payload?: unknown },
        callback?: (response: MessageResponse) => void
      ): void;
      openOptionsPage?: () => void;
    };
    storage: {
      local: {
        get(keys: string, callback: (result: { customTiers?: Tier[] }) => void): void;
      };
    };
    tabs: {
      query(
        queryInfo: { active: boolean; currentWindow: boolean },
        callback: (tabs: ChromeTab[]) => void
      ): void;
      sendMessage(
        tabId: number,
        message: { type: string; payload?: unknown },
        callback?: (response: MessageResponse) => void
      ): void;
    };
  };
};

const { runtime, tabs, storage } = chromeGlobal.chrome;

function isSupportedUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /https:\/\/([^.]+\.)?(youtube\.com|x\.com|twitch\.tv)\//.test(url);
}

function truncatePublicKey(publicKey: string | null): string {
  if (!publicKey) return 'Not connected';
  return `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}`;
}

function parseCreatorFromUrl(url: string | undefined): { name: string; domain: string; handle: string } | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const segments = parsed.pathname.split('/').filter(Boolean);

    if (host.includes('x.com')) {
      const handle = segments[0];
      return handle ? { name: `@${handle}`, domain: host, handle } : null;
    }

    if (host.includes('twitch.tv')) {
      const handle = segments[0];
      return handle && handle !== 'directory' ? { name: handle, domain: host, handle } : null;
    }

    if (host.includes('youtube.com')) {
      const atHandle = segments.find((part) => part.startsWith('@'));
      if (atHandle) {
        return { name: atHandle, domain: host, handle: atHandle };
      }

      const channelIndex = segments.indexOf('channel');
      if (channelIndex >= 0 && segments[channelIndex + 1]) {
        const handle = segments[channelIndex + 1];
        return { name: handle, domain: host, handle };
      }

      const userIndex = segments.indexOf('user');
      if (userIndex >= 0 && segments[userIndex + 1]) {
        const handle = segments[userIndex + 1];
        return { name: handle, domain: host, handle };
      }
    }
  } catch {
    return null;
  }

  return null;
}

const Popup: React.FC = () => {
  const [wallet, setWallet] = useState<WalletState>({ connected: false, publicKey: null });
  const [streamStats, setStreamStats] = useState<StreamStats>({ active: 0, paused: 0, totalSpentThisMonth: 0 });
  const [currentPageCreator, setCurrentPageCreator] = useState<CreatorInfo | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hasPhantom, setHasPhantom] = useState(false);

  useEffect(() => {
    setHasPhantom(Boolean(window.solana?.isPhantom));

    storage.local.get('customTiers', (result) => {
      if (result.customTiers && result.customTiers.length > 0) {
        setTiers(result.customTiers);
      }
    });

    runtime.sendMessage({ type: 'GET_WALLET_STATUS' }, (response: MessageResponse) => {
      const err = chromeGlobal.chrome.runtime.lastError;
      if (err) {
        void err.message;
        return;
      }
      setWallet({
        connected: Boolean(response.connected),
        publicKey: response.publicKey ?? null,
      });
    });

    runtime.sendMessage({ type: 'GET_STREAM_STATS' }, (response: MessageResponse) => {
      const err = chromeGlobal.chrome.runtime.lastError;
      if (err) {
        void err.message;
        return;
      }
      setStreamStats({
        active: Number(response.active ?? 0),
        paused: Number(response.paused ?? 0),
        totalSpentThisMonth: Number(response.totalSpentThisMonth ?? 0),
      });
    });

    tabs.query({ active: true, currentWindow: true }, (activeTabs: ChromeTab[]) => {
      const activeTab = activeTabs[0];
      const creator = parseCreatorFromUrl(activeTab?.url);
      if (!creator) {
        setCurrentPageCreator(null);
        return;
      }

      runtime.sendMessage(
        {
          type: 'RESOLVE_CREATOR_WALLET',
          payload: { domain: creator.domain, handle: creator.handle },
        },
        (response?: CreatorResolutionResponse) => {
          const err = chromeGlobal.chrome.runtime.lastError;
          if (err) {
            void err.message;
            setCurrentPageCreator(null);
            return;
          }

          if (response?.wallet) {
            setCurrentPageCreator({ name: creator.name, wallet: response.wallet });
          } else {
            setCurrentPageCreator(null);
          }
        }
      );
    });
  }, []);

  const connectWallet = () => {
    setActionError(null);

    runtime.sendMessage({ type: 'CONNECT_WALLET' }, (response: MessageResponse) => {
      const err = chromeGlobal.chrome.runtime.lastError;
      if (err) {
        void err.message;
        setActionError('Unable to reach background service. Reload the extension and try again.');
        return;
      }

      if (response.success) {
        setWallet({
          connected: true,
          publicKey: response.publicKey ?? null,
        });
        return;
      }

      const tryPopupPhantom = async () => {
        if (!window.solana?.isPhantom) {
          tabs.query({ active: true, currentWindow: true }, (activeTabs: ChromeTab[]) => {
            const activeTab = activeTabs[0];
            const tabId = activeTab?.id;
            if (!tabId || !isSupportedUrl(activeTab?.url)) {
              setActionError('Open a YouTube, X, or Twitch page and try Connect again.');
              return;
            }

            tabs.sendMessage(tabId, { type: 'CONNECT_WALLET_IN_PAGE' }, (tabResponse?: MessageResponse) => {
              const tabErr = chromeGlobal.chrome.runtime.lastError;
              if (tabErr) {
                void tabErr.message;
                runtime.sendMessage(
                  { type: 'CONNECT_WALLET_IN_TAB', payload: { tabId } },
                  (fallbackResponse?: MessageResponse) => {
                    const fallbackErr = chromeGlobal.chrome.runtime.lastError;
                    if (fallbackErr) {
                      void fallbackErr.message;
                      setActionError('Could not reach page wallet. Refresh the tab and try again.');
                      return;
                    }

                    if (fallbackResponse?.success && fallbackResponse.publicKey) {
                      setWallet({ connected: true, publicKey: fallbackResponse.publicKey });
                      return;
                    }

                    setActionError(fallbackResponse?.error || 'Could not reach page wallet. Refresh the tab and try again.');
                  }
                );
                return;
              }

              if (tabResponse?.success && tabResponse.publicKey) {
                setWallet({ connected: true, publicKey: tabResponse.publicKey });
                return;
              }

              setActionError(tabResponse?.error || 'Unable to connect wallet. Ensure Phantom is unlocked.');
            });
          });
          return;
        }

        try {
          const result = await window.solana.connect();
          setWallet({ connected: true, publicKey: result.publicKey.toString() });
        } catch {
          setActionError('Wallet connection was rejected.');
        }
      };

      void tryPopupPhantom();
    });
  };

  const handleQuickTip = () => {
    setActionError(null);
    if (!currentPageCreator || tiers.length === 0) return;

    runtime.sendMessage({
      type: 'QUICK_TIP',
      payload: {
        recipient: currentPageCreator.wallet,
        amount: tiers[0].amount,
      },
    }, (response?: MessageResponse) => {
      const err = chromeGlobal.chrome.runtime.lastError;
      if (err) {
        void err.message;
        setActionError('Could not send quick tip. Reload the extension and try again.');
        return;
      }

      if (response?.success === false) {
        setActionError(response.error || 'Quick tip failed.');
      }
    });
  };

  const openOptions = () => {
    setActionError(null);

    if (runtime.openOptionsPage) {
      runtime.openOptionsPage();
      return;
    }

    try {
      window.open('settings.html', '_blank');
    } catch {
      setActionError('Could not open options page.');
    }
  };

  return (
    <div className="popup-container">
      <div className="status-bar">
        <span className={`wallet-dot ${wallet.connected ? 'connected' : 'disconnected'}`} />
        <span className="wallet-address">{truncatePublicKey(wallet.publicKey)}</span>
        {!wallet.connected && (
          <>
            <button className="connect-inline" onClick={connectWallet}>Connect</button>
            {!hasPhantom && (
              <a
                className="install-phantom-link"
                href="https://phantom.app/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Install Phantom
              </a>
            )}
          </>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{streamStats.active}</div>
          <div className="stat-label">Active Streams</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${streamStats.totalSpentThisMonth.toFixed(2)}</div>
          <div className="stat-label">This Month</div>
        </div>
      </div>

      {currentPageCreator && tiers.length > 0 && (
        <div className="current-creator">
          <span>You're on {currentPageCreator.name}'s page</span>
          <button className="tip-inline" onClick={handleQuickTip}>⚡ Tip ${tiers[0].amount}</button>
        </div>
      )}

      <div className="quick-actions">
        <button className="secondary-action" disabled title="Pause all coming soon">⏸️ Pause All</button>
        <button className="secondary-action" onClick={() => setSettingsOpen((open) => !open)}>
          ⚙️ Settings
        </button>
        <button className="secondary-action" onClick={openOptions}>
          Open Options
        </button>
      </div>

      {actionError && <div className="tip-feedback">{actionError}</div>}

      {settingsOpen && (
        <div className="settings-slide-down">
          <Settings />
        </div>
      )}
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
