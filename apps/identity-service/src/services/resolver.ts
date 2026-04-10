import { resolveWalletFromDNS } from './dns.js';
import { resolveWalletFromNostr } from './nostr.js';
import { getCachedWallet, setCachedWallet } from './cache.js';

const CACHE_TTL = Number(process.env.CACHE_TTL) || 3600;

export async function resolveWallet(domain: string, handle?: string): Promise<string | null> {
  const cacheKey = handle ? `${domain}:${handle}` : domain;
  
  // Check cache
  const cached = await getCachedWallet(cacheKey);
  if (cached) {
    console.log(`Cache hit for ${cacheKey}`);
    return cached;
  }

  // 1. Try DNS
  const dnsWallet = await resolveWalletFromDNS(domain);
  if (dnsWallet) {
    await setCachedWallet(cacheKey, dnsWallet, CACHE_TTL);
    return dnsWallet;
  }

  // 2. Fallback to Nostr (if handle provided)
  if (handle) {
    const nostrWallet = await resolveWalletFromNostr(handle, domain);
    if (nostrWallet) {
      await setCachedWallet(cacheKey, nostrWallet, CACHE_TTL);
      return nostrWallet;
    }
  }

  return null;
}