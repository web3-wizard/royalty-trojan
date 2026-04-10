import { storage } from '../utils/storage.js';

const IDENTITY_SERVICE_BASE_URL = 'http://localhost:3001';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 300;
const WALLET_CACHE_TTL_SECONDS = 3600;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
	return status === 429 || status >= 500;
}

export async function resolveCreatorWallet(domain?: string, handle?: string): Promise<string | null> {
	if (!domain && !handle) return null;

	const cacheKey = domain ? `wallet:${domain}` : `wallet:${handle}`;
	const cachedWallet = await storage.get<string>(cacheKey);
	if (cachedWallet) return cachedWallet;

	const url = new URL('/resolve', IDENTITY_SERVICE_BASE_URL);
	if (domain) {
		url.searchParams.set('domain', domain);
	}
	if (handle) {
		url.searchParams.set('handle', handle);
	}

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
		try {
			const response = await fetch(url.toString());

			if (!response.ok) {
				if (isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
					const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
					await sleep(delay);
					continue;
				}
				return null;
			}

			const data = (await response.json()) as { wallet?: string };
			const wallet = data.wallet ?? null;
			if (wallet) {
				await storage.set(cacheKey, wallet, WALLET_CACHE_TTL_SECONDS);
			}
			return wallet;
		} catch (error) {
			if (attempt < MAX_RETRIES) {
				const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
				await sleep(delay);
				continue;
			}

			console.error('Identity resolution failed after retries:', error);
			return null;
		}
	}

	return null;
}
