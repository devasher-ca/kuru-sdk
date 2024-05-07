import { Pool } from "pg";

class TradeStorageService {
	private db: Pool;
	private tableName: string;

	constructor(marketAddress: string, dbConfig: any) {
		this.db = new Pool(dbConfig);
		this.tableName = `trades_${marketAddress}`;
	}

	async addTrade(
		takerAddress: string,
		order_id: number,
		size: number,
		timestamp: number
	) {
		const query = `
            INSERT INTO ${this.tableName} (taker_address, order_id, size, timestamp)
            VALUES ($1, $2, $3, $4)
        `;

		await this.db.query(query, [takerAddress, order_id, size, timestamp]);
	}
}

export default TradeStorageService;
