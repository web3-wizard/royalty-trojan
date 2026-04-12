import React from 'react';

interface Props {
  connected: boolean;
  publicKey: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const WalletStatus: React.FC<Props> = ({ connected, publicKey, onConnect, onDisconnect }) => {
  const truncatedKey = publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}` : '';

  return (
    <div className="wallet-status">
      {connected ? (
        <>
          <span className="status-indicator connected"></span>
          <span className="address">{truncatedKey}</span>
          <button onClick={onDisconnect} className="disconnect-btn">Disconnect</button>
        </>
      ) : (
        <>
          <span className="status-indicator disconnected"></span>
          <span>Wallet not connected</span>
          <button onClick={onConnect} className="connect-btn">Connect Phantom</button>
        </>
      )}
    </div>
  );
};