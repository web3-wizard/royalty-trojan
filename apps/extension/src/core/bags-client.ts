import { Bags, type StreamConfig } from '@bags.foundation/sdk';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import type { WalletAdapter } from './wallet-adapter/index.js';

export class BagsClient {
  private bags: Bags;
  private connection: Connection;

  constructor(rpcUrl: string = clusterApiUrl('mainnet-beta')) {
    this.connection = new Connection(rpcUrl);
    this.bags = new Bags(this.connection);
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

    const config: StreamConfig = {
      sender,
      receiver,
      ratePerSecond,
      tokenMint: 'So11111111111111111111111111111111111111112', // wSOL or SOL
      startTime: Math.floor(Date.now() / 1000),
      // Optionally set endTime if not indefinite
    };

    // The Bags SDK expects a signer; we'll use a custom signer that delegates to wallet
    const signature = await this.bags.createStream(config, {
      signTransaction: async (tx) => {
        // Wallet adapter expects to sign and send in one step, but SDK may want separate
        // We'll adapt by having the wallet sign and return the signed transaction
        throw new Error('Need to implement custom signer adapter');
      },
    });

    // For now, we'll implement a simplified version that uses the wallet's signAndSend directly
    // because Bags SDK may not expose transaction creation without signer.
    // We'll use the underlying transaction builder.

    // Placeholder: return mock signature
    return 'mock_signature_' + Date.now();
  }
}