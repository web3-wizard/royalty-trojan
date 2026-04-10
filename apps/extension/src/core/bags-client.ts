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

type StreamSigner = {
  publicKey: PublicKey;
  signAndSendTransaction: (tx: WalletTx) => Promise<string>;
};

type StreamService = {
  createStream(config: StreamConfig, signer: StreamSigner): Promise<string>;
  cancelStream(streamId: string, signer: StreamSigner): Promise<string>;
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

  private getStreamService(): StreamService {
    const sdk = this.bags as unknown as { stream?: StreamService; streams?: StreamService };
    const service = sdk.stream ?? sdk.streams;
    if (!service) {
      throw new Error('Bags SDK stream service is unavailable in this SDK version');
    }
    return service;
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
    const streamService = this.getStreamService();

    return streamService.createStream(config, signer);
  }

  async cancelStream(wallet: WalletAdapter, streamId: string): Promise<string> {
    if (!wallet.connected) await wallet.connect();
    if (!wallet.publicKey) throw new Error('Wallet not connected');

    const sender = new PublicKey(wallet.publicKey);
    const signer = this.getSigner(wallet, sender);
    const streamService = this.getStreamService();

    return streamService.cancelStream(streamId, signer);
  }
}