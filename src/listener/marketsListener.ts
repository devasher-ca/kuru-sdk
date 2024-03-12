import { ethers } from "ethers";
import { Pool } from "pg";
import OrderStorageService from "../db/orders";
import TradeStorageService from "../db/trades";
import OrderBookStorageService from "../db/orderbook";

class MarketListener {
	private contract: ethers.Contract;
	private db: Pool;
	private orderStorageService: OrderStorageService;
	private tradeStorageService: TradeStorageService;
	private orderBookStorageService: OrderBookStorageService;

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

		// Initialize storage middlewares
		this.orderStorageService = new OrderStorageService(dbConfig);
		this.tradeStorageService = new TradeStorageService(dbConfig);
		this.orderBookStorageService = new OrderBookStorageService(dbConfig);

		// TODO: fetch historic event data and populate db(indexer?)
	}

	async saveOrder(
		orderId: number,
		ownerAddress: string,
		size: number,
		price: number,
		isBuy: boolean
	) {
		const dbPromises: Promise<any>[] = [];
		dbPromises.push(
			this.orderStorageService.saveOrder(
				orderId,
				ownerAddress,
				size,
				price,
				isBuy
			)
		);

		dbPromises.push(
			this.orderBookStorageService.saveOrderToOrderBook(
				orderId,
				ownerAddress,
				size,
				price,
				isBuy
			)
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
		timestamp: number
	) {
		const query = `
            INSERT INTO trades (taker_address, size, is_buy, timestamp)
            VALUES ($1, $2, $3, $4, $5)
        `;

		await this.db.query(query, [takerAddress, size, isBuy, timestamp]);
	}

	async listenForOrderEvents() {
		this.contract.on(
			"OrderCreated",
			async (
				orderId: number,
				ownerAddress: string,
				size: number,
				price: number,
				isBuy: boolean
			) => {
				console.log(
					`OrderCreated event detected for orderId: ${orderId} owner: ${ownerAddress} price: ${price} size: ${size} isBuy: ${isBuy}`
				);

				await this.saveOrder(orderId, ownerAddress, size, price, isBuy);
				console.log(`Order Saved: ${orderId}`);
			}
		);

		this.contract.on(
			"OrderUpdated",
			async (orderId: number, updatedSize: number) => {
				console.log(
					`OrderUpdated event detected for orderIds: ${orderId} updatedSizes: ${updatedSize}`
				);

				updatedSize === 0
					? await this.orderBookStorageService.deleteOrders([orderId]).catch((error) =>
							console.error(`Error deleting order: ${error}`)
					  )
					: await this.orderBookStorageService.updateOrderSize(orderId, updatedSize).catch((error) =>
							console.error(`Error updating order size: ${error}`)
					  );
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
						? deletedOrders.push(orderIds[i])
						: updatePromises.push(
								this.orderBookStorageService.updateOrderSize(orderIds[i], updatedSizes[i]).catch(
									(error) =>
										console.error(`Error updating order size: ${error}`)
								)
						  );
				}

				if (deletedOrders.length > 0) {
					console.log(`OrdersDeleted: ${deletedOrders}`);
					updatePromises.push(
						this.orderBookStorageService.deleteOrders(deletedOrders).catch((error) =>
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
			async (takerAddress: string, orderSize: number) => {
				console.log(
					`SellIOC event detected for taker: ${takerAddress} orderSize: ${orderSize}`
				);

				await this.tradeStorageService.addTrade(takerAddress, orderSize, false, Date.now());

				console.log(`Added trade for taker: ${takerAddress}`);
			}
		);

		this.contract.on(
			"BuyIOC",
			async (takerAddress: string, orderSize: number) => {
				console.log(
					`BuyIOC event detected for taker: ${takerAddress} orderSize: ${orderSize}`
				);

				await this.tradeStorageService.addTrade(takerAddress, orderSize, true, Date.now());

				console.log(`Added trade for taker: ${takerAddress}`);
			}
		);

		this.contract.on("OrdersCanceled", async (orderIds: number[]) => {
			console.log(`OrdersCanceled event detected for orderId: ${orderIds}`);

			await this.orderBookStorageService.deleteOrders(orderIds);
			console.log(`Order Deleted: ${orderIds}`);
		});
	}
}

export default MarketListener;
