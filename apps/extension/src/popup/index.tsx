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

type ChromeTab = { id?: number };

const DEFAULT_TIERS: Tier[] = [
  { name: 'Tip Jar', amount: 5 },
  { name: 'Supporter', amount: 10 },
  { name: 'Patron', amount: 20 },
];

const chromeGlobal = globalThis as typeof globalThis & {
  chrome: {
    runtime: {
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
      const tabId = activeTabs[0]?.id;
      if (!tabId) return;
      tabs.sendMessage(tabId, { type: 'GET_CREATOR_INFO' }, (response?: MessageResponse) => {
        if (response?.creator) setCurrentPageCreator(response.creator);
      });
    });
  }, []);

  const connectWallet = () => {
    runtime.sendMessage({ type: 'CONNECT_WALLET' }, (response: MessageResponse) => {
      setWallet({
        connected: Boolean(response.success),
        publicKey: response.publicKey ?? null,
      });
    });
  };

  const handleQuickTip = () => {
    if (!currentPageCreator || tiers.length === 0) return;

    runtime.sendMessage({
      type: 'QUICK_TIP',
      payload: {
        recipient: currentPageCreator.wallet,
        amount: tiers[0].amount,
      },
    });
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
        <button className="secondary-action" onClick={() => runtime.openOptionsPage?.()}>
          Open Options
        </button>
      </div>

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
