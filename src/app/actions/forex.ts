// NOTE: You must create a .env.local file in your project root and add:
// TWELVE_DATA_API_KEY=YOUR_API_KEY

const API_KEY = process.env.TWELVE_DATA_API_KEY;
const BASE_URL = 'https://api.twelvedata.com/time_series';

interface ForexDataPoint {
  time: string;
  price: number;
}

interface TwelveDataApiResponse {
    values: {
        datetime: string;
        close: string;
    }[];
    status: string;
    code?: number;
    message?: string;
}

export async function getForexData(from_symbol: string, to_symbol: string): Promise<{ success: boolean, data?: ForexDataPoint[], message?: string }> {
    if (!API_KEY) {
        console.error("Twelve Data API key is not configured in .env.local.");
        return { success: false, message: 'Server is not configured for live data.' };
    }
    
    const symbol = `${from_symbol}/${to_symbol}`;
    const url = `${BASE_URL}?symbol=${symbol}&interval=5min&apikey=${API_KEY}`;

    try {
        // Use Next.js fetch caching to revalidate every 5 minutes (300 seconds)
        const response = await fetch(url, { next: { revalidate: 300 } }); 
        
        if (!response.ok) {
            console.error(`API request failed with status: ${response.status}`);
            return { success: false, message: `Could not connect to data provider. Status: ${response.status}` };
        }
        
        const result: TwelveDataApiResponse = await response.json();

        if (result.status === 'error' || !result.values) {
            console.error("Twelve Data API Error:", result.message || "Invalid data format received.");
            return { success: false, message: result.message || 'Invalid data from API. The API limit may have been reached.' };
        }

        const data: ForexDataPoint[] = result.values
            .map(value => {
                // The datetime is like "2024-07-29 15:55:00", we just want the time "15:55"
                const timePart = value.datetime.substring(11, 16);
                return {
                    time: timePart,
                    price: parseFloat(value.close),
                };
            })
            .reverse(); // The API returns data from newest to oldest, so we reverse it.

        // Return the last 30 data points
        return { success: true, data: data.slice(-30) };

    } catch (error) {
        console.error("Critical error in getForexData:", error);
        return { success: false, message: 'Could not fetch live market data.' };
    }
}
