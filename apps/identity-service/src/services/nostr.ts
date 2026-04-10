import { resolveNostrWallet } from '../clients/nostr-client.js';

export async function resolveWalletFromNostr(handle: string, domain?: string): Promise<string | null> {
  return resolveNostrWallet(handle, domain);
}