import { storage } from '../utils/storage.js';

// Get service URL from chrome.runtime storage or default to localhost
// This will be set during extension installation with the actual deployed URL
const getServiceUrl = async (): Promise<string> => {
	return new Promise((resolve) => {
		chrome.storage.sync.get('IDENTITY_SERVICE_URL', (result) => {
			resolve(result.IDENTITY_SERVICE_URL || 'http://localhost:3001');
		});
	});
};

let cachedServiceUrl: string | null = null;

async function getIdentityServiceUrl(): Promise<string> {
	if (cachedServiceUrl) return cachedServiceUrl;
	cachedServiceUrl = await getServiceUrl();
	return cachedServiceUrl;
}

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

	const baseUrl = await getIdentityServiceUrl();
	const url = new URL('/resolve', baseUrl);
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
