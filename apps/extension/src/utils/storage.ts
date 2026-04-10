type StorageRecord<T> = {
  value: T;
  expiresAt?: number;
};

declare const chrome: {
  storage?: {
    local: {
      get(keys: string | string[] | null, callback: (items: Record<string, unknown>) => void): void;
      set(items: Record<string, unknown>, callback?: () => void): void;
      remove(keys: string | string[], callback?: () => void): void;
    };
  };
};

function hasStorage(): boolean {
  return Boolean(chrome?.storage?.local);
}

async function get<T>(key: string): Promise<T | null> {
  if (!hasStorage()) return null;

  const items = await new Promise<Record<string, unknown>>((resolve) => {
    chrome.storage!.local.get(key, resolve);
  });

  const raw = items[key];
  if (!raw || typeof raw !== 'object') return null;

  const record = raw as StorageRecord<T>;
  if (record.expiresAt && record.expiresAt <= Date.now()) {
    await new Promise<void>((resolve) => {
      chrome.storage!.local.remove(key, resolve);
    });
    return null;
  }

  return record.value ?? null;
}

async function set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  if (!hasStorage()) return;

  const record: StorageRecord<T> = {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
  };

  await new Promise<void>((resolve) => {
    chrome.storage!.local.set({ [key]: record }, resolve);
  });
}

export const storage = {
  get,
  set,
};
