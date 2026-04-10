// For now, return null; full implementation in a later phase.
export async function resolveWalletFromNostr(handle: string, domain?: string): Promise<string | null> {
  // TODO: Query Nostr relays for kind 0 metadata containing a bags wallet tag.
  // Example: use NIP-05 to get pubkey, then fetch kind 0, look for "nip57" or custom tag.
  console.log(`Nostr resolution not implemented for ${handle}@${domain}`);
  return null;
}