import type { Transaction, VersionedTransaction } from '@solana/web3.js';

export interface WalletAdapter {
  name: string;
  icon: string;
  ready: boolean;
  connected: boolean;
  publicKey: string | null;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  signAndSendTransaction(tx: Transaction | VersionedTransaction): Promise<string>;
}