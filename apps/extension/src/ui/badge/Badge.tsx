import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface BadgeProps {
  creatorWallet: string;
  creatorName: string;
  platform: string;
}

export const Badge: React.FC<BadgeProps> = ({ creatorWallet, creatorName, platform }) => {
  const [revenue, setRevenue] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [userStreams, setUserStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch total revenue for creator
  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const response = await fetch(`http://localhost:3001/revenue?wallet=${creatorWallet}`);
        const data = await response.json();
        setRevenue(data.totalRevenueUSD);
      } catch (err) {
        console.error('Failed to fetch revenue:', err);
      }
    };
    fetchRevenue();
  }, [creatorWallet]);

  // Fetch user's active streams to this creator
  const fetchUserStreams = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get current wallet public key from background
      chrome.runtime.sendMessage({ type: 'GET_WALLET_STATUS' }, async (status) => {
        if (!status.connected || !status.publicKey) {
          setError('Connect wallet to view your streams');
          setLoading(false);
          return;
        }
        // Call Bags API to list streams from user to creator
        const response = await fetch(`http://localhost:3001/streams?sender=${status.publicKey}&receiver=${creatorWallet}`);
        const data = await response.json();
        setUserStreams(data.streams || []);
        setLoading(false);
      });
    } catch (err) {
      setError('Failed to fetch streams');
      setLoading(false);
    }
  };

  const handleToggleExpand = () => {
    if (!isExpanded) {
      fetchUserStreams();
    }
    setIsExpanded(!isExpanded);
  };

  const handleCancelStream = async (streamId: string) => {
    try {
      chrome.runtime.sendMessage(
        { type: 'CANCEL_STREAM', payload: { streamId } },
        (response) => {
          if (response.success) {
            setUserStreams(userStreams.filter(s => s.id !== streamId));
          } else {
            setError(response.error || 'Cancel failed');
          }
        }
      );
    } catch (err) {
      setError('Cancel failed');
    }
  };

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <div style={badgeContainerStyle}>
      <div style={badgeStyle} onClick={handleToggleExpand}>
        <span style={iconStyle}>💰</span>
        <span style={labelStyle}>Bags Verified</span>
        {revenue !== null && (
          <span style={revenueStyle}>{formatUSD(revenue)} earned</span>
        )}
        <span style={arrowStyle}>{isExpanded ? '▼' : '▶'}</span>
      </div>
      {isExpanded && (
        <div style={dropdownStyle}>
          <h4>Your Support for {creatorName}</h4>
          {loading && <div>Loading...</div>}
          {error && <div style={{ color: 'red' }}>{error}</div>}
          {!loading && userStreams.length === 0 && (
            <p>You haven't started a stream yet.</p>
          )}
          {userStreams.map((stream) => (
            <div key={stream.id} style={streamItemStyle}>
              <div>
                <strong>${stream.amountPerMonth}/mo</strong>
                <div>Started {new Date(stream.startTime * 1000).toLocaleDateString()}</div>
              </div>
              <button onClick={() => handleCancelStream(stream.id)} style={cancelButtonStyle}>
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Styles
const badgeContainerStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-block',
  marginLeft: '12px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const badgeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 10px',
  backgroundColor: '#f0f0f0',
  borderRadius: '20px',
  fontSize: '14px',
  cursor: 'pointer',
  userSelect: 'none',
  border: '1px solid #ddd',
};

const iconStyle: React.CSSProperties = {
  fontSize: '16px',
};

const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  color: '#333',
};

const revenueStyle: React.CSSProperties = {
  color: '#666',
  marginLeft: '4px',
};

const arrowStyle: React.CSSProperties = {
  marginLeft: '4px',
  fontSize: '10px',
  color: '#888',
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: '8px',
  backgroundColor: 'white',
  border: '1px solid #ddd',
  borderRadius: '8px',
  padding: '12px',
  minWidth: '250px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  zIndex: 10000,
  color: '#000',
};

const streamItemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
  borderBottom: '1px solid #eee',
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '4px 8px',
  backgroundColor: '#ff4444',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
};

// Function to inject badge into DOM
export function injectBadge(container: HTMLElement, props: BadgeProps) {
  // Remove existing badge if any
  const existing = container.querySelector('.rt-badge-container');
  if (existing) existing.remove();

  const badgeContainer = document.createElement('span');
  badgeContainer.className = 'rt-badge-container';
  container.appendChild(badgeContainer);

  const root = createRoot(badgeContainer);
  root.render(<Badge {...props} />);
}