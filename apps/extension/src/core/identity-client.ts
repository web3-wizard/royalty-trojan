const IDENTITY_SERVICE_BASE_URL = 'http://localhost:3001';

export async function resolveCreatorWallet(domain?: string, handle?: string): Promise<string | null> {
	if (!domain && !handle) return null;

	const url = new URL('/resolve', IDENTITY_SERVICE_BASE_URL);
	if (domain) {
		url.searchParams.set('domain', domain);
	}
	if (handle) {
		url.searchParams.set('handle', handle);
	}

	try {
		const response = await fetch(url.toString());
		if (!response.ok) return null;

		const data = (await response.json()) as { wallet?: string };
		return data.wallet ?? null;
	} catch (error) {
		console.error('Identity resolution failed:', error);
		return null;
	}
}
