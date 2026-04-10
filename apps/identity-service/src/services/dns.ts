import { queryTXT } from '../clients/doh-client.js';

const BAGS_PREFIX = 'bags:v1:creator=';

export async function resolveWalletFromDNS(domain: string): Promise<string | null> {
  const records = await queryTXT(domain);
  for (const record of records) {
    if (record.startsWith(BAGS_PREFIX)) {
      const wallet = record.substring(BAGS_PREFIX.length).trim();
      if (isValidSolanaAddress(wallet)) {
        return wallet;
      }
    }
  }
  return null;
}

function isValidSolanaAddress(address: string): boolean {
  // Solana addresses are base58, 32-44 characters
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}