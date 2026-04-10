import type { WalletAdapter } from './index.js';
import { Transaction, VersionedTransaction, Connection, clusterApiUrl } from '@solana/web3.js';

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect(): Promise<{ publicKey: { toString(): string } }>;
      disconnect(): Promise<void>;
      signAndSendTransaction(tx: Transaction | VersionedTransaction): Promise<{ signature: string }>;
      publicKey: { toString(): string } | null;
    };
  }
}

export class PhantomWalletAdapter implements WalletAdapter {
  name = 'Phantom';
  icon = 'https://phantom.app/favicon.ico';
  
  get ready(): boolean {
    return typeof window !== 'undefined' && !!window.solana?.isPhantom;
  }

  get connected(): boolean {
    return this.ready && !!window.solana?.publicKey;
  }

  get publicKey(): string | null {
    return this.connected ? window.solana!.publicKey!.toString() : null;
  }

  async connect(): Promise<void> {
    if (!this.ready) throw new Error('Phantom not installed');
    await window.solana!.connect();
  }

  async disconnect(): Promise<void> {
    if (this.ready) await window.solana!.disconnect();
  }

  async signAndSendTransaction(tx: Transaction | VersionedTransaction): Promise<string> {
    if (!this.ready) throw new Error('Phantom not installed');
    const result = await window.solana!.signAndSendTransaction(tx);
    return result.signature;
  }
}