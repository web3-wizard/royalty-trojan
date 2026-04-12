import React, { useState, useEffect } from 'react';

interface Tier {
  name: string;
  amount: number;
}

interface SettingsStorageResult {
  customTiers?: Tier[];
}

const chromeStorage = (globalThis as typeof globalThis & {
  chrome: {
    storage: {
      local: {
        get(
          keys: string,
          callback: (result: SettingsStorageResult) => void
        ): void;
        set(items: Record<string, unknown>, callback?: () => void): void;
      };
    };
  };
}).chrome.storage.local;

const DEFAULT_TIERS: Tier[] = [
  { name: 'Tip Jar', amount: 5 },
  { name: 'Supporter', amount: 10 },
  { name: 'Patron', amount: 20 },
];

export const Settings: React.FC = () => {
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load saved tiers from storage
    chromeStorage.get('customTiers', (result: SettingsStorageResult) => {
      if (result.customTiers) {
        setTiers(result.customTiers);
      }
    });
  }, []);

  const saveTiers = () => {
    chromeStorage.set({ customTiers: tiers }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const updateTier = (index: number, field: keyof Tier, value: string | number) => {
    const newTiers = [...tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setTiers(newTiers);
  };

  return (
    <div className="settings">
      <h3>Custom Payment Tiers</h3>
      {tiers.map((tier, i) => (
        <div key={i} className="tier-input">
          <input
            type="text"
            value={tier.name}
            onChange={(e) => updateTier(i, 'name', e.target.value)}
            placeholder="Name"
          />
          <input
            type="number"
            min="1"
            step="1"
            value={tier.amount}
            onChange={(e) => updateTier(i, 'amount', Number(e.target.value))}
            placeholder="USD/month"
          />
          <span>$</span>
        </div>
      ))}
      <button onClick={saveTiers} className="save-btn">Save Tiers</button>
      {saved && <span className="saved-indicator">Saved!</span>}
      
      <hr />
      <h3>About</h3>
      <p>Royalty Trojan v0.1.0</p>
      <p>Built on Solana and Bags protocol.</p>
    </div>
  );
};