declare const chrome: {
  storage: {
    local: {
      get(keys: string | string[]): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
  };
};

export const storage = {
  async get(key: string): Promise<any> {
    const result = await chrome.storage.local.get(key);
    return result[key];
  },
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const data: any = { [key]: value };
    if (ttlSeconds) {
      data[`${key}_expiry`] = Date.now() + ttlSeconds * 1000;
    }
    await chrome.storage.local.set(data);
  },
};
