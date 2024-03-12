import { Pool } from "pg";

class TradeStorageService {
	private db: Pool;

	constructor(dbConfig: any) {
		this.db = new Pool(dbConfig);
	}

	async addTrade(
		takerAddress: string,
		size: number,
		isBuy: boolean,
		timestamp: number
	) {
		const query = `
            INSERT INTO trades (taker_address, size, is_buy, timestamp)
            VALUES ($1, $2, $3, $4)
        `;

		await this.db.query(query, [takerAddress, size, isBuy, timestamp]);
	}
}

export default TradeStorageService;
