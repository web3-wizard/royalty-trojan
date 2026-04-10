import React from 'react';

interface SpinnerProps {
  size?: number;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 16 }) => {
  return <span style={{ ...spinnerStyle, width: size, height: size }} aria-label="Loading" />;
};

if (typeof document !== 'undefined' && !document.getElementById('rt-spinner-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'rt-spinner-styles';
  styleElement.textContent = `
    @keyframes rt-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleElement);
}

const spinnerStyle: React.CSSProperties = {
  display: 'inline-block',
  border: '2px solid rgba(255, 255, 255, 0.35)',
  borderTopColor: '#ffffff',
  borderRadius: '50%',
  animation: 'rt-spin 0.8s linear infinite',
  boxSizing: 'border-box',
};
