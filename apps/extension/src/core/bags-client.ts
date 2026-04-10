import { PublicKey, clusterApiUrl } from '@solana/web3.js';
import type { WalletAdapter } from './wallet-adapter/index.js';

export class BagsClient {
  constructor(rpcUrl: string = clusterApiUrl('mainnet-beta')) {
    void rpcUrl;
  }

  async createStream(
    wallet: WalletAdapter,
    recipient: string,
    amountPerMonth: number
  ): Promise<string> {
    if (!wallet.connected) await wallet.connect();

    const sender = new PublicKey(wallet.publicKey!);
    const receiver = new PublicKey(recipient);

    // Convert monthly amount to per-second rate (approx)
    const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;
    const ratePerSecond = amountPerMonth / SECONDS_PER_MONTH;

    void sender;
    void receiver;
    void ratePerSecond;

    const tokenMint = 'So11111111111111111111111111111111111111112';
    void tokenMint;

    const signTransaction = async (tx: Parameters<WalletAdapter['signAndSendTransaction']>[0]) => {
      void tx;
      throw new Error('Need to implement custom signer adapter');
    };
    void signTransaction;

    return 'mock_signature_' + Date.now();
  }

  async cancelStream(wallet: WalletAdapter, streamId: string): Promise<string> {
    if (!wallet.connected) await wallet.connect();

    if (!wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    void streamId;
    return 'mock_cancel_signature_' + Date.now();
  }
}