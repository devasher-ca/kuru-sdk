import { Pool } from "pg";

class OrderBookStorageService {
	private db: Pool;

	constructor(dbConfig: any) {
		this.db = new Pool(dbConfig);
	}

	async saveOrderToOrderBook(
		orderId: number,
		ownerAddress: string,
		size: number,
		price: number,
		isBuy: boolean
	) {
		const orderbookQuery = `
            INSERT INTO orderbook (order_id, owner_address, size, price, is_buy, is_updated)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;

		await this.db
			.query(orderbookQuery, [orderId, ownerAddress, size, price, isBuy, false])
			.catch((error) => console.error(`Error updating order size: ${error}`));
	}

    async updateOrderSize(orderId: number, newSize: number) {
		const query = `
            UPDATE orderbook 
            SET size = $2, is_updated = true
            WHERE order_id = $1;
        `;

		await this.db.query(query, [orderId, newSize]);
	}

    async deleteOrders(orderIds: number[]) {
		const query = `DELETE FROM orderbook WHERE order_id = ANY($1);`;
		await this.db.query(query, [orderIds]);
	}
}

export default OrderBookStorageService;
