import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { WalletStatus } from './components/WalletStatus';
import { ActiveStreams } from './components/ActiveStreams';
import { Settings } from './components/Settings';
import { Welcome } from './components/Welcome';
import './styles.css';

type Tab = 'welcome' | 'streams' | 'settings';

const Popup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('welcome');
  const [walletConnected, setWalletConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    // Check wallet status on mount
    chrome.runtime.sendMessage({ type: 'GET_WALLET_STATUS' }, (response) => {
      setWalletConnected(response.connected);
      setPublicKey(response.publicKey);
    });
  }, []);

  const handleConnect = () => {
    chrome.runtime.sendMessage({ type: 'CONNECT_WALLET' }, (response) => {
      if (response.success) {
        setWalletConnected(true);
        setPublicKey(response.publicKey);
      }
    });
  };

  const handleDisconnect = () => {
    chrome.runtime.sendMessage({ type: 'DISCONNECT_WALLET' }, (response) => {
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