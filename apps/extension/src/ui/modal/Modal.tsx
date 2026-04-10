import React, { useState, useEffect } from 'react';

interface Tier {
  name: string;
  amount: number;
  description: string;
}

interface WalletStatusResponse {
  connected: boolean;
  publicKey: string | null;
  ready?: boolean;
  success?: boolean;
  error?: string;
  signature?: string;
}

declare const chrome: {
  runtime: {
    sendMessage(
      message: { type: string; payload?: unknown },
      callback: (response: WalletStatusResponse) => void
    ): void;
  };
};

const TIERS: Tier[] = [
  { name: 'Tip Jar', amount: 5, description: 'One-time $5 tip (streamed over 1 day)' },
  { name: 'Supporter', amount: 10, description: 'Monthly $10 support' },
  { name: 'Patron', amount: 20, description: 'Monthly $20 patron' },
];

interface ModalProps {
  creatorName: string;
  recipientWallet: string;
  onClose: () => void;
  onSuccess: (signature: string, tier: Tier) => void;
}

export const Modal: React.FC<ModalProps> = ({ creatorName, recipientWallet, onClose, onSuccess }) => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [success, setSuccess] = useState<{ signature: string; tier: Tier } | null>(null);

  useEffect(() => {
    // Check current wallet status from background
    chrome.runtime.sendMessage({ type: 'GET_WALLET_STATUS' }, (response: WalletStatusResponse) => {
      setWalletConnected(response.connected);
      setPublicKey(response.publicKey);
    });
  }, []);

  const handleConnectWallet = async () => {
    setError(null);
    setLoading(true);
    chrome.runtime.sendMessage({ type: 'CONNECT_WALLET' }, (response: WalletStatusResponse) => {
      setLoading(false);
      if (response.success) {
        setWalletConnected(true);
        setPublicKey(response.publicKey);
      } else {
        setError(response.error || 'Failed to connect wallet');
      }
    });
  };

  const handleSubscribe = async () => {
    if (!selectedTier || !walletConnected) return;
    setError(null);
    setLoading(true);
    chrome.runtime.sendMessage(
      {
        type: 'CREATE_STREAM',
        payload: {
          recipient: recipientWallet,
          amount: selectedTier.amount,
          tier: selectedTier,
        },
      },
      (response: WalletStatusResponse) => {
        if (response.success && response.signature) {
          setSuccess({ signature: response.signature, tier: selectedTier });
          setLoading(false);
          onSuccess(response.signature, selectedTier);
        } else {
          setLoading(false);
          setError(response.error || 'Stream creation failed');
        }
      }
    );
  };

  if (success) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <h2>🎉 Success!</h2>
          <p>Your {success.tier.name} stream has been created.</p>
          <p>
            <a
              href={`https://solscan.io/tx/${success.signature}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View transaction
            </a>
          </p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2>Support {creatorName}</h2>
        <p>Recipient: {recipientWallet.slice(0, 6)}...{recipientWallet.slice(-4)}</p>

        {!walletConnected ? (
          <div>
            <p>Connect your wallet to continue</p>
            <button onClick={handleConnectWallet} disabled={loading}>
              {loading ? 'Connecting...' : 'Connect Phantom'}
            </button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
          </div>
        ) : (
          <div>
            <p>Connected: {publicKey?.slice(0, 6)}...{publicKey?.slice(-4)}</p>
            <h3>Select a tier</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              {TIERS.map((tier) => (
                <button
                  key={tier.name}
                  onClick={() => setSelectedTier(tier)}
                  style={{
                    padding: '10px',
                    border: selectedTier?.name === tier.name ? '2px solid blue' : '1px solid gray',
                    borderRadius: '8px',
                  }}
                >
                  <strong>{tier.name}</strong>
                  <div>${tier.amount}/month</div>
                  <small>{tier.description}</small>
                </button>
              ))}
            </div>
            <button onClick={handleSubscribe} disabled={!selectedTier || loading}>
              {loading ? 'Creating Stream...' : `Subscribe with ${selectedTier?.name}`}
            </button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
          </div>
        )}

        <button onClick={onClose} style={{ marginTop: '20px' }}>Cancel</button>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 999999,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: '24px',
  borderRadius: '12px',
  maxWidth: '500px',
  width: '90%',
  color: '#000',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
};