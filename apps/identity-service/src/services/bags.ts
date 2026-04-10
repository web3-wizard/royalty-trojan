import axios from 'axios';

const BAGS_API_URL = 'https://api.bags.foundation';

export async function fetchCreatorRevenue(wallet: string): Promise<number> {
	try {
		const response = await axios.get(`${BAGS_API_URL}/creator/revenue`, {
			params: { wallet },
		});
		return response.data.totalRevenueUSD;
	} catch (err) {
		console.error('Bags revenue fetch error:', err);
		return 0;
	}
}

export async function fetchUserStreams(sender: string, receiver: string): Promise<any[]> {
	try {
		const response = await axios.get(`${BAGS_API_URL}/streams`, {
			params: { sender, receiver },
		});
		return response.data.streams || [];
	} catch (err) {
		console.error('Bags streams fetch error:', err);
		return [];
	}
}
