import { Pool } from "pg";

class OrderStorageService {
	private db: Pool;
	private tableName: string;

	constructor(marketAddress: string, dbConfig: any) {
		this.db = new Pool(dbConfig);
		this.tableName = `orders_${marketAddress}`;
	}

	async saveOrder(
		orderId: number,
		ownerAddress: string,
		size: number,
		price: number,
		isBuy: boolean
	) {
		const orderQuery = `
            INSERT INTO ${this.tableName} (order_id, owner_address, size, price, is_buy)
            VALUES ($1, $2, $3, $4, $5)
        `;

		await this.db
			.query(orderQuery, [orderId, ownerAddress, size, price, isBuy])
			.catch((error) => console.error(`Error inserting orders: ${error}`));
	}

    async updateOrderSize(orderId: number, newSize: number) {
		const query = `
            UPDATE ${this.tableName} 
            SET size = $2
            WHERE order_id = $1;
        `;

		await this.db.query(query, [orderId, newSize]);
	}
}

export default OrderStorageService;
