import { ethers } from "ethers";
import { Pool } from "pg";

class OrderStorageService {
	private contract: ethers.Contract;
	private db: Pool;

	constructor(
		rpcUrl: string,
		contractAddress: string,
		contractABI: any,
		dbConfig: any
	) {
		const provider = new ethers.JsonRpcProvider(rpcUrl);
		this.contract = new ethers.Contract(contractAddress, contractABI, provider);

		// Initialize the database connection
		this.db = new Pool(dbConfig);

		// TODO: fetch historic event data and populate db(indexer?)
	}

	async saveOrder(
		orderId: number,
		ownerAddress: string,
		price: number,
		size: number,
		acceptableRange: number,
		isBuy: boolean
	) {
		const dbPromises: Promise<any>[] = [];
		const orderbookQuery = `
            INSERT INTO orderbook (order_id, owner_address, price, size, acceptable_range, is_buy, is_updated)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

		dbPromises.push(
			this.db
				.query(orderbookQuery, [
					orderId,
					ownerAddress,
					price,
					size,
					acceptableRange,
					isBuy,
					false,
				])
				.catch((error) => console.error(`Error updating order size: ${error}`))
		);

		const orderQuery = `
            INSERT INTO orders (order_id, owner_address, price, size, acceptable_range, is_buy)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;

		dbPromises.push(
			this.db
				.query(orderQuery, [
					orderId,
					ownerAddress,
					price,
					size,
					acceptableRange,
					isBuy,
				])
				.catch((error) => console.error(`Error inserting orders: ${error}`))
		);

		await Promise.all(dbPromises);
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

	async addTrade(
		takerAddress: string,
		size: number,
		isBuy: boolean,
        orderIds: number[],
		timestamp: number
	) {
		const query = `
            INSERT INTO trades (taker_address, size, is_buy, maker_orders, timestamp)
            VALUES ($1, $2, $3, $4, $5)
        `;

		await this.db.query(query, [takerAddress, size, isBuy, orderIds, timestamp]);
	}

	async listenForOrderEvents() {
		this.contract.on(
			"OrderCreated",
			async (
				orderId: number,
				ownerAddress: string,
				price: number,
				size: number,
				acceptableRange: number,
				isBuy: boolean
			) => {
				console.log(
					`OrderCreated event detected for orderId: ${orderId} owner: ${ownerAddress} price: ${price} size: ${size} isBuy: ${isBuy}`
				);

				await this.saveOrder(
					orderId,
					ownerAddress,
					price,
					size,
					acceptableRange,
					isBuy
				);
				console.log(`Order Saved: ${orderId}`);
			}
		);

		this.contract.on(
			"OrdersUpdated",
			async (orderIds: number[], updatedSizes: number[]) => {
				console.log(
					`OrdersUpdated event detected for orderIds: ${orderIds} updatedSizes: ${updatedSizes}`
				);
				const deletedOrders: number[] = [];
				const updatePromises: Promise<any>[] = [];

				for (let i = 0; i < orderIds.length; i++) {
					updatedSizes[i] === 0
						? updatePromises.push(
								this.updateOrderSize(orderIds[i], updatedSizes[i]).catch(
									(error) =>
										console.error(`Error updating order size: ${error}`)
								)
						  )
						: deletedOrders.push(orderIds[i]);
				}

				if (deletedOrders.length > 0) {
					console.log(`OrdersDeleted: ${deletedOrders}`);
					updatePromises.push(
						this.deleteOrders(deletedOrders).catch((error) =>
							console.error(`Error deleting orders: ${error}`)
						)
					);
				}

				await Promise.all(updatePromises);
				console.log(`Orders Updated: ${orderIds}`);
			}
		);

		this.contract.on(
			"SellIOC",
			async (
				takerAddress: string,
				orderSize: number,
				orderIds: number[],
				updatedSizes: number[]
			) => {
				console.log(
					`SellIOC event detected for orderIds: ${orderIds} updatedSizes: ${updatedSizes}`
				);
				const deletedOrders: number[] = [];
				const updatePromises: Promise<any>[] = [];

				for (let i = 0; i < orderIds.length; i++) {
					updatedSizes[i] === 0
						? updatePromises.push(
								this.updateOrderSize(orderIds[i], updatedSizes[i]).catch(
									(error) =>
										console.error(`Error updating order size: ${error}`)
								)
						  )
						: deletedOrders.push(orderIds[i]);
				}

				if (deletedOrders.length > 0) {
					console.log(`OrdersDeleted: ${deletedOrders}`);
					updatePromises.push(
						this.deleteOrders(deletedOrders).catch((error) =>
							console.error(`Error deleting orders: ${error}`)
						)
					);
				}

				await Promise.all(updatePromises);
				await this.addTrade(takerAddress, orderSize, false, orderIds, Date.now());

				console.log(`Orders Updated: ${orderIds}`);
			}
		);

		this.contract.on(
			"BuyIOC",
			async (
				takerAddress: string,
				orderSize: number,
				orderIds: number[],
				updatedSizes: number[]
			) => {
				console.log(
					`BuyIOC event detected for orderIds: ${orderIds} updatedSizes: ${updatedSizes}`
				);
				const deletedOrders: number[] = [];
				const updatePromises: Promise<any>[] = [];

				for (let i = 0; i < orderIds.length; i++) {
					updatedSizes[i] === 0
						? updatePromises.push(
								this.updateOrderSize(orderIds[i], updatedSizes[i]).catch(
									(error) =>
										console.error(`Error updating order size: ${error}`)
								)
						  )
						: deletedOrders.push(orderIds[i]);
				}

				if (deletedOrders.length > 0) {
					console.log(`OrdersDeleted: ${deletedOrders}`);
					updatePromises.push(
						this.deleteOrders(deletedOrders).catch((error) =>
							console.error(`Error deleting orders: ${error}`)
						)
					);
				}

				await Promise.all(updatePromises);
				await this.addTrade(takerAddress, orderSize, true, orderIds, Date.now());

				console.log(`Orders Updated: ${orderIds}`);
			}
		);

		this.contract.on("OrdersCanceled", async (orderIds: number[]) => {
			console.log(`OrdersCanceled event detected for orderId: ${orderIds}`);

			await this.deleteOrders(orderIds);
			console.log(`Order Deleted: ${orderIds}`);
		});
	}
}

export default OrderStorageService;
