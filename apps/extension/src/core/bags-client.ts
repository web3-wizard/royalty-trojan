import { BagsSDK } from '@bags.foundation/sdk';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import type { WalletAdapter } from './wallet-adapter/index.js';

type WalletTx = Parameters<WalletAdapter['signAndSendTransaction']>[0];

type StreamConfig = {
  sender: PublicKey;
  receiver: PublicKey;
  ratePerSecond: number;
  tokenMint: string;
  startTime: number;
};

export class BagsClient {
  private readonly bags: BagsSDK;
  private readonly connection: Connection;

  constructor(
    rpcUrl: string = clusterApiUrl('mainnet-beta'),
    apiKey: string = ''
  ) {
    this.connection = new Connection(rpcUrl);
    this.bags = new BagsSDK(apiKey, this.connection);
  }

  private getSigner(wallet: WalletAdapter, sender: PublicKey) {
    return {
      publicKey: sender,
      signAndSendTransaction: async (tx: WalletTx): Promise<string> => {
        return wallet.signAndSendTransaction(tx);
      },
    };
  }

  private getStreamApi(): Record<string, unknown> {
    const sdk = this.bags as unknown as Record<string, unknown>;

    // Support possible SDK variants for stream APIs.
    const streamApi =
      (sdk.stream as Record<string, unknown> | undefined)
      || (sdk.streams as Record<string, unknown> | undefined)
      || (sdk.solana as Record<string, unknown> | undefined)
      || sdk;

    return streamApi;
  }

  private async callCreateStream(
    streamApi: Record<string, unknown>,
    config: StreamConfig,
    signer: { publicKey: PublicKey; signAndSendTransaction: (tx: WalletTx) => Promise<string> }
  ): Promise<string> {
    const candidates: Array<unknown> = [
      streamApi.createStream,
      (streamApi.stream as Record<string, unknown> | undefined)?.createStream,
      (streamApi.streams as Record<string, unknown> | undefined)?.createStream,
    ];

    for (const candidate of candidates) {
      if (typeof candidate !== 'function') continue;

      const createFn = candidate as (...args: unknown[]) => Promise<unknown>;
      try {
        const signature = await createFn(config, signer);
        if (typeof signature === 'string') return signature;
      } catch {
        // Try the next known signature/entrypoint.
      }

      try {
        const signature = await createFn({ ...config, signer });
        if (typeof signature === 'string') return signature;
      } catch {
        // Try the next known signature/entrypoint.
      }
    }

    throw new Error('Bags SDK createStream API not available in this SDK build');
  }

  private async callCancelStream(
    streamApi: Record<string, unknown>,
    streamId: string,
    signer: { publicKey: PublicKey; signAndSendTransaction: (tx: WalletTx) => Promise<string> }
  ): Promise<string> {
    const candidates: Array<unknown> = [
      streamApi.cancelStream,
      (streamApi.stream as Record<string, unknown> | undefined)?.cancelStream,
      (streamApi.streams as Record<string, unknown> | undefined)?.cancelStream,
    ];

    for (const candidate of candidates) {
      if (typeof candidate !== 'function') continue;

      const cancelFn = candidate as (...args: unknown[]) => Promise<unknown>;
      try {
        const signature = await cancelFn(streamId, signer);
        if (typeof signature === 'string') return signature;
      } catch {
        // Try the next known signature/entrypoint.
      }

      try {
        const signature = await cancelFn({ streamId, signer });
        if (typeof signature === 'string') return signature;
      } catch {
        // Try the next known signature/entrypoint.
      }
    }

    throw new Error('Bags SDK cancelStream API not available in this SDK build');
  }

  async createStream(
    wallet: WalletAdapter,
    recipient: string,
    amountPerMonth: number
  ): Promise<string> {
    if (!wallet.connected) await wallet.connect();
    if (!wallet.publicKey) throw new Error('Wallet not connected');

    const sender = new PublicKey(wallet.publicKey);
    const receiver = new PublicKey(recipient);

    // Convert monthly amount to per-second rate (approx)
    const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;
    const ratePerSecond = amountPerMonth / SECONDS_PER_MONTH;

    const config: StreamConfig = {
      sender,
      receiver,
      ratePerSecond,
      tokenMint: 'So11111111111111111111111111111111111111112',
      startTime: Math.floor(Date.now() / 1000),
    };

    const signer = this.getSigner(wallet, sender);
    const streamApi = this.getStreamApi();

    return this.callCreateStream(streamApi, config, signer);
  }

  async cancelStream(wallet: WalletAdapter, streamId: string): Promise<string> {
    if (!wallet.connected) await wallet.connect();
    if (!wallet.publicKey) throw new Error('Wallet not connected');

    const sender = new PublicKey(wallet.publicKey);
    const signer = this.getSigner(wallet, sender);
    const streamApi = this.getStreamApi();

    return this.callCancelStream(streamApi, streamId, signer);
  }
}