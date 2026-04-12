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

const Popup: React.FC = () => {
  const [wallet, setWallet] = useState<WalletState>({ connected: false, publicKey: null });
  const [streamStats, setStreamStats] = useState<StreamStats>({ active: 0, paused: 0, totalSpentThisMonth: 0 });
  const [currentPageCreator, setCurrentPageCreator] = useState<CreatorInfo | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    storage.local.get('customTiers', (result) => {
      if (result.customTiers && result.customTiers.length > 0) {
        setTiers(result.customTiers);
      }
    });

    runtime.sendMessage({ type: 'GET_WALLET_STATUS' }, (response: MessageResponse) => {
      setWallet({
        connected: Boolean(response.connected),
        publicKey: response.publicKey ?? null,
      });
    });

    runtime.sendMessage({ type: 'GET_STREAM_STATS' }, (response: MessageResponse) => {
      setStreamStats({
        active: Number(response.active ?? 0),
        paused: Number(response.paused ?? 0),
        totalSpentThisMonth: Number(response.totalSpentThisMonth ?? 0),
      });
    });

    tabs.query({ active: true, currentWindow: true }, (activeTabs: ChromeTab[]) => {
      const activeTab = activeTabs[0];
      const tabId = activeTab?.id;
      if (!isSupportedUrl(activeTab?.url)) {
        setCurrentPageCreator(null);
        return;
      }
      if (!tabId) return;

      tabs.sendMessage(tabId, { type: 'GET_CREATOR_INFO' }, (response?: MessageResponse) => {
        if (runtime.lastError) {
          setCurrentPageCreator(null);
          return;
        }

        if (response?.creator) setCurrentPageCreator(response.creator);
      });
    });
  }, []);

  const connectWallet = () => {
    setActionError(null);

    runtime.sendMessage({ type: 'CONNECT_WALLET' }, (response: MessageResponse) => {
      if (response.success) {
        setWallet({
          connected: true,
          publicKey: response.publicKey ?? null,
        });
        return;
      }

      const tryPopupPhantom = async () => {
        if (!window.solana?.isPhantom) {
          setActionError('Unable to connect wallet. Ensure Phantom is installed and unlocked.');
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
          <button className="connect-inline" onClick={connectWallet}>Connect</button>
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
