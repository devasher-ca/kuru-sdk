// ============ Internal Imports ============
import { Pool } from "../types/pool";

interface MarketResponse {
    success: boolean;
    data: {
        data: Array<{
            baseasset: string;
            quoteasset: string;
            market: string;
        }>;
        pagination: {
            limit: number;
            offset: number;
            total: number;
        };
    };
}

export class PoolFetcher {
    private baseUrl: string;

    constructor(baseUrl: string) {
        // Remove trailing slash if present
        this.baseUrl = baseUrl.replace(/\/$/, "");
    }

    static async create(baseUrl: string): Promise<PoolFetcher> {
        return new PoolFetcher(baseUrl);
    }

    async getAllPools(): Promise<Pool[]> {
        try {
            const response = await fetch(
                `${this.baseUrl}/api/v1/markets/search`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const marketData: MarketResponse = await response.json();

            if (!marketData.success) {
                throw new Error("API request was not successful");
            }

            return marketData.data.data.map((market) => ({
                baseToken: market.baseasset,
                quoteToken: market.quoteasset,
                orderbook: market.market,
            }));
        } catch (error) {
            console.error("Error fetching pools:", error);
            throw error;
        }
    }
}
