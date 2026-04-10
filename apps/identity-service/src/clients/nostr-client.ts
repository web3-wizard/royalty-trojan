import { SimplePool, nip19, nip05 } from 'nostr-tools';
import type { Event } from 'nostr-tools';

const RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
];

export async function resolveNostrWallet(handle: string, domain?: string): Promise<string | null> {
  const pool = new SimplePool();
  
  try {
    let pubkey: string | null = null;

    // If domain is provided, try NIP-05 resolution first
    if (domain) {
      const fullHandle = `${handle}@${domain}`;
      const profile = await nip05.queryProfile(fullHandle);
      if (profile?.pubkey) {
        pubkey = profile.pubkey;
      }
    }

    // If no domain or NIP-05 fails, try searching for the handle as a pubkey (hex or npub)
    if (!pubkey) {
      try {
        if (handle.startsWith('npub1')) {
          const decoded = nip19.decode(handle);
          if (decoded.type === 'npub') pubkey = decoded.data as string;
        } else if (/^[0-9a-f]{64}$/.test(handle)) {
          pubkey = handle;
        }
      } catch {}
    }

    if (!pubkey) {
      pool.close(RELAYS);
      return null;
    }

    // Fetch kind 0 metadata
    const filter = { kinds: [0], authors: [pubkey], limit: 1 };
    const events = await pool.querySync(RELAYS, filter);
    
    if (events.length === 0) {
      pool.close(RELAYS);
      return null;
    }

    const metadataEvent = events[0] as Event;
    const content = JSON.parse(metadataEvent.content);
    
    // Look for Bags wallet in metadata (could be a 'bags' field or 'nip57' lud16)
    let wallet: string | null = null;
    if (content.bags) {
      wallet = content.bags;
    } else if (content.lud16) {
      // Lightning address might be used, but we need Solana wallet
      // For now, we can ignore
    }

    pool.close(RELAYS);
    return wallet;
  } catch (error) {
    console.error('Nostr resolution error:', error);
    pool.close(RELAYS);
    return null;
  }
}