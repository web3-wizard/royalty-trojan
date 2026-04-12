import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { WalletStatus } from './components/WalletStatus.js';
import { ActiveStreams } from './components/ActiveStreams.js';
import { Settings } from './components/Settings.js';
import { Welcome } from './components/Welcome.js';
import './styles.css';

interface WalletStatusResponse {
  connected: boolean;
  publicKey: string | null;
  ready?: boolean;
  success?: boolean;
  error?: string | { code?: string; message?: string; details?: unknown };
  signature?: string;
}

const chromeRuntime = (globalThis as typeof globalThis & {
  chrome: {
    runtime: {
      sendMessage(
        message: { type: string; payload?: unknown },
        callback: (response: WalletStatusResponse) => void
      ): void;
    };
  };
}).chrome.runtime;

type Tab = 'welcome' | 'streams' | 'settings';

const Popup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('welcome');
  const [walletConnected, setWalletConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    // Check wallet status on mount
    chromeRuntime.sendMessage({ type: 'GET_WALLET_STATUS' }, (response: WalletStatusResponse) => {
      setWalletConnected(response.connected);
      setPublicKey(response.publicKey);
    });
  }, []);

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

  return (
    <div className="popup-container">
      <header className="header">
        <img src="/assets/icon48.png" alt="Royalty Trojan" width="32" height="32" />
        <h1>Royalty Trojan</h1>
      </header>

      <WalletStatus 
        connected={walletConnected} 
        publicKey={publicKey}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      <nav className="tabs">
        <button 
          className={activeTab === 'welcome' ? 'active' : ''} 
          onClick={() => setActiveTab('welcome')}
        >
          Welcome
        </button>
        <button 
          className={activeTab === 'streams' ? 'active' : ''} 
          onClick={() => setActiveTab('streams')}
        >
          Streams
        </button>
        <button 
          className={activeTab === 'settings' ? 'active' : ''} 
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </nav>

      <main className="content">
        {activeTab === 'welcome' && <Welcome connected={walletConnected} />}
        {activeTab === 'streams' && <ActiveStreams publicKey={publicKey} />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}