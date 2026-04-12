import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Settings } from './components/Settings.js';
import './styles.css';

interface WalletStatusResponse {
  connected: boolean;
  publicKey: string | null;
  ready?: boolean;
  success?: boolean;
  error?: string | { code?: string; message?: string; details?: unknown };
  signature?: string;
}

interface StreamSummary {
  creatorWallet?: string;
  status?: string;
}

interface StreamListResponse {
  success?: boolean;
  streams?: StreamSummary[];
  error?: string | { code?: string; message?: string; details?: unknown };
}

interface PageStatusResponse {
  success?: boolean;
  supported?: boolean;
  creatorDetected?: boolean;
  bagsEnabled?: boolean;
  creatorName?: string;
  wallet?: string;
  platform?: string;
  error?: string;
}

interface QuickTipResponse {
  success?: boolean;
  signature?: string;
  error?: string;
}

interface ChromeTab {
  id?: number;
  url?: string;
}

const chromeGlobal = globalThis as typeof globalThis & {
  chrome: {
    runtime: {
      sendMessage(
        message: { type: string; payload?: unknown },
        callback: (response: WalletStatusResponse) => void
      ): void;
    };
    tabs: {
      query(
        queryInfo: { active: boolean; currentWindow: boolean },
        callback: (tabs: ChromeTab[]) => void
      ): void;
      sendMessage(
        tabId: number,
        message: { type: string; payload?: unknown },
        callback?: (response: { success?: boolean; error?: string }) => void
      ): void;
    };
  };
};

const chromeRuntime = chromeGlobal.chrome.runtime;
const chromeTabs = chromeGlobal.chrome.tabs;

function isSupportedUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /https:\/\/([^.]+\.)?(youtube\.com|x\.com|twitch\.tv)\//.test(url);
}

function truncateWallet(publicKey: string | null): string {
  if (!publicKey) return 'Not connected';
  return publicKey.length > 12 ? `${publicKey.slice(0, 4)}...${publicKey.slice(-6)}` : publicKey;
}

const Popup: React.FC = () => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [activeStreams, setActiveStreams] = useState<StreamSummary[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [isSupportedPage, setIsSupportedPage] = useState(false);
  const [pageStatus, setPageStatus] = useState<PageStatusResponse | null>(null);
  const [isQuickTipping, setIsQuickTipping] = useState(false);
  const [quickTipMessage, setQuickTipMessage] = useState<string | null>(null);

  useEffect(() => {
    chromeTabs.query({ active: true, currentWindow: true }, (tabs: ChromeTab[]) => {
      const currentTab = tabs[0];
      setActiveTabId(currentTab?.id ?? null);
      setIsSupportedPage(isSupportedUrl(currentTab?.url));
    });
  }, []);

  useEffect(() => {
    if (!activeTabId || !isSupportedPage) {
      setPageStatus(null);
      return;
    }

    chromeTabs.sendMessage(activeTabId, { type: 'GET_CURRENT_PAGE_STATUS' }, (response?: PageStatusResponse) => {
      if (!response) {
        setPageStatus({
          success: false,
          supported: true,
          creatorDetected: false,
          bagsEnabled: false,
          error: 'Could not read page status.',
        });
        return;
      }
      setPageStatus(response);
    });
  }, [activeTabId, isSupportedPage]);

  useEffect(() => {
    chromeRuntime.sendMessage({ type: 'GET_WALLET_STATUS' }, (response: WalletStatusResponse) => {
      setWalletConnected(response.connected);
      setPublicKey(response.publicKey);
    });
  }, []);

  useEffect(() => {
    if (!publicKey) {
      setActiveStreams([]);
      return;
    }

    chromeRuntime.sendMessage(
      { type: 'GET_ALL_STREAMS', payload: { sender: publicKey } },
      (response: StreamListResponse) => {
        setActiveStreams(response.success ? response.streams ?? [] : []);
      }
    );
  }, [publicKey]);

  const handleConnect = () => {
    chromeRuntime.sendMessage({ type: 'CONNECT_WALLET' }, (response: WalletStatusResponse) => {
      if (response.success) {
        setWalletConnected(true);
        setPublicKey(response.publicKey);
      }
    });
  };

  const handleDisconnect = () => {
    chromeRuntime.sendMessage({ type: 'DISCONNECT_WALLET' }, (response: WalletStatusResponse) => {
      if (response.success) {
        setWalletConnected(false);
        setPublicKey(null);
      }
    });
  };

  const handleQuickTip = () => {
    if (!activeTabId) return;

    setIsQuickTipping(true);
    setQuickTipMessage(null);
    chromeTabs.sendMessage(
      activeTabId,
      { type: 'QUICK_TIP_CURRENT_CREATOR', payload: { amount: 5 } },
      (response?: QuickTipResponse) => {
        if (response?.success) {
          setQuickTipMessage('Tip started successfully.');
          if (publicKey) {
            chromeRuntime.sendMessage(
              { type: 'GET_ALL_STREAMS', payload: { sender: publicKey } },
              (streamResponse: StreamListResponse) => {
                setActiveStreams(streamResponse.success ? streamResponse.streams ?? [] : []);
              }
            );
          }
        } else {
          setQuickTipMessage(response?.error || 'Quick tip failed.');
        }
        setIsQuickTipping(false);
      }
    );
  };

  const handleOpenTipModal = () => {
    if (!activeTabId) return;
    chromeTabs.sendMessage(activeTabId, { type: 'OPEN_CURRENT_CREATOR_TIP' }, () => {
      void 0;
    });
  };

  const activeStreamCount = activeStreams.length;
  const pausedStreamCount = activeStreams.filter((stream) => stream.status === 'paused').length;
  const supportingCreatorsCount = new Set(
    activeStreams.map((stream) => stream.creatorWallet || 'unknown')
  ).size;

  const creatorStatusText = !isSupportedPage
    ? 'Open YouTube, X, or Twitch to detect the current creator.'
    : !pageStatus?.creatorDetected
      ? 'Creator not detected on this page yet.'
      : pageStatus.bagsEnabled
        ? `${pageStatus.creatorName || 'Creator'} is Bags-enabled.`
        : `${pageStatus.creatorName || 'Creator'} has not enabled Bags yet.`;

  return (
    <div className="popup-shell">
      <header className="dashboard-header">
        <div className="brand-mark">
          <img src="/assets/icon48.png" alt="Royalty Trojan" width="32" height="32" />
          <div>
            <h1>Royalty Trojan</h1>
            <p>Status-first creator subscriptions</p>
          </div>
        </div>
        <div className="header-stats">
          <span>{activeStreamCount} active</span>
          <span>{supportingCreatorsCount} creators</span>
        </div>
      </header>

      <main className="dashboard-grid">
        <section className="wallet-panel">
          <div className="wallet-row">
            <div>
              <span className={`status-dot ${walletConnected ? 'connected' : 'disconnected'}`} />
              <span className="wallet-label">Wallet: {walletConnected ? 'Connected' : 'Disconnected'}</span>
              <span className="wallet-separator">|</span>
              <span className="wallet-key">{truncateWallet(publicKey)}</span>
            </div>
            {walletConnected ? (
              <button className="link-button" onClick={handleDisconnect}>
                Disconnect
              </button>
            ) : (
              <button className="primary-button" onClick={handleConnect}>
                Connect
              </button>
            )}
          </div>
        </section>

        <section className="metrics-panel">
          <div className="metric-row">
            <span>💰 Active Streams: {activeStreamCount}</span>
            <span>⏸️ Paused: {pausedStreamCount}</span>
          </div>
          <div className="metric-divider" />
          <p className="supporting-copy">📊 Supporting {supportingCreatorsCount} creators this month</p>
        </section>

        <section className="actions-panel">
          <h2>Quick Actions</h2>
          <div className="action-stack">
            <div className="action-hint current-page-status">{creatorStatusText}</div>
            <button
              className="primary-action"
              onClick={handleQuickTip}
              disabled={!walletConnected || !isSupportedPage || !pageStatus?.bagsEnabled || isQuickTipping}
            >
              {isQuickTipping ? 'Sending Tip...' : '⚡ Tip $5'}
            </button>
            <button
              className="secondary-action"
              onClick={handleOpenTipModal}
              disabled={!isSupportedPage || !pageStatus?.creatorDetected}
            >
              Open Tier Picker
            </button>
            <button className="secondary-action" disabled title="Pause All Streams is not available yet">
              ⏸️ Pause All Streams
            </button>
            {quickTipMessage && <div className="tip-feedback">{quickTipMessage}</div>}
          </div>
        </section>

        <section className="trust-panel" aria-label="Permission explanation">
          <h2>🔒 We request these permissions:</h2>
          <ul className="trust-list">
            <li>
              <strong>storage:</strong> Save your custom tiers and wallet cache.
            </li>
            <li>
              <strong>activeTab:</strong> Only access the page when you click the icon or use a quick action.
            </li>
            <li>
              <strong>Host permissions (YouTube, X, Twitch):</strong> To inject the Bags badge and intercept
              subscribe buttons.
            </li>
          </ul>
          <a className="privacy-link" href="privacy-policy.html" target="_blank" rel="noopener noreferrer">
            Read our privacy policy
          </a>
        </section>

        <details className="settings-accordion">
          <summary>⚙️ Settings</summary>
          <div className="settings-panel">
            <Settings />
          </div>
        </details>
      </main>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}