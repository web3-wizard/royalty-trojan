import React, { useState, useEffect } from 'react';

interface Stream {
  id: string;
  creatorName: string;
  creatorWallet: string;
  amountPerMonth: number;
  startTime: number;
  status: string;
}

interface StreamListResponse {
  success?: boolean;
  streams?: Stream[];
  error?: string | { code?: string; message?: string; details?: unknown };
}

const chromeRuntime = (globalThis as typeof globalThis & {
  chrome: {
    runtime: {
      lastError?: { message?: string };
      sendMessage(
        message: { type: string; payload?: unknown },
        callback: (response: StreamListResponse) => void
      ): void;
    };
  };
}).chrome.runtime;

declare const chrome: {
  runtime: {
    sendMessage(
      message: { type: string; payload?: unknown },
      callback: (response: StreamListResponse) => void
    ): void;
  };
};

export const ActiveStreams: React.FC<{ publicKey: string | null }> = ({ publicKey }) => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    chromeRuntime.sendMessage({ type: 'GET_ALL_STREAMS', payload: { sender: publicKey } }, (response: StreamListResponse) => {
      const err = chromeRuntime.lastError;
      if (err) {
        void err.message;
        setLoading(false);
        return;
      }

      if (response.success) {
        setStreams(response.streams ?? []);
      }
      setLoading(false);
    });
  }, [publicKey]);

  const handleCancel = (streamId: string) => {
    chromeRuntime.sendMessage({ type: 'CANCEL_STREAM', payload: { streamId } }, (response: StreamListResponse) => {
      const err = chromeRuntime.lastError;
      if (err) {
        void err.message;
        return;
      }

      if (response.success) {
        setStreams(streams.filter(s => s.id !== streamId));
      }
    });
  };

  if (!publicKey) {
    return <p className="message">Connect wallet to view active streams.</p>;
  }

  if (loading) {
    return <p className="message">Loading streams...</p>;
  }

  if (streams.length === 0) {
    return <p className="message">No active streams.</p>;
  }

  return (
    <div className="streams-list">
      {streams.map(stream => (
        <div key={stream.id} className="stream-item">
          <div className="stream-info">
            <strong>{stream.creatorName}</strong>
            <span>${stream.amountPerMonth}/mo</span>
            <small>Started {new Date(stream.startTime * 1000).toLocaleDateString()}</small>
          </div>
          <button onClick={() => handleCancel(stream.id)} className="cancel-btn">Cancel</button>
        </div>
      ))}
    </div>
  );
};