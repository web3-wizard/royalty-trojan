import React from 'react';

export const Welcome: React.FC<{ connected: boolean }> = ({ connected }) => {
  return (
    <div className="welcome">
      <h2>Welcome to Royalty Trojan</h2>
      <p>Support creators directly with streaming payments on Solana.</p>
      
      {!connected && (
        <div className="callout">
          <p>Connect your Phantom wallet to get started.</p>
        </div>
      )}

      <h3>How it works:</h3>
      <ol>
        <li>Browse YouTube, X, or Twitch</li>
        <li>Click any Subscribe/Follow button</li>
        <li>Choose a tier and start streaming</li>
      </ol>

      <h3>For Creators:</h3>
      <p>Add a TXT record to your domain to enable payments:</p>
      <code>bags:v1:creator=YOUR_SOLANA_WALLET</code>
      <p className="hint">Or set your Nostr profile with a "bags" field.</p>
    </div>
  );
};