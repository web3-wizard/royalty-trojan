import axios from 'axios';

const DOH_ENDPOINT = 'https://cloudflare-dns.com/dns-query';

export async function queryTXT(domain: string): Promise<string[]> {
  const params = new URLSearchParams({
    name: domain,
    type: 'TXT',
  });

  try {
    const response = await axios.get(`${DOH_ENDPOINT}?${params}`, {
      headers: { 'Accept': 'application/dns-json' },
    });

    const answers = response.data.Answer || [];
    const txtRecords: string[] = [];

    for (const ans of answers) {
      if (ans.type === 16) { // TXT record
        // The data is a string with quotes, e.g., '"bags:v1:creator=..."'
        const raw = ans.data.replace(/^"|"$/g, '');
        txtRecords.push(raw);
      }
    }
    return txtRecords;
  } catch (error) {
    console.error(`DNS query failed for ${domain}:`, error);
    return [];
  }
}