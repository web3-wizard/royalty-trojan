const IDENTITY_SERVICE_BASE_URL = 'http://localhost:3001';

export async function resolveCreatorWallet(domain: string | undefined, handle: string): Promise<string | null> {
	const url = new URL('/resolve', IDENTITY_SERVICE_BASE_URL);
	if (domain) {
		url.searchParams.set('domain', domain);
	}
	url.searchParams.set('handle', handle);

	const response = await fetch(url.toString(), {
		method: 'GET',
		headers: {
			Accept: 'application/json',
		},
	});

	if (response.status === 404) {
		return null;
	}

	if (!response.ok) {
		throw new Error(`Failed to resolve creator wallet: ${response.status}`);
	}

	const data = (await response.json()) as { wallet?: string };
	return data.wallet ?? null;
}
