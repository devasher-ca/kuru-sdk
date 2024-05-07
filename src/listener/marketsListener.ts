import { ethers } from "ethers";
import OrderStorageService from "../db/orders";
import TradeStorageService from "../db/trades";
import OrderBookStorageService from "../db/orderbook";
import orderbookAbi from '../../abi/CranklessOrderBook.json';

class MarketListener {
	private contract: ethers.Contract;
	private orderStorageService: OrderStorageService;
	private tradeStorageService: TradeStorageService;
	private orderBookStorageService: OrderBookStorageService;

	constructor(
		rpcUrl: string,
		contractAddress: string,
		dbConfig: any
	) {
		const provider = new ethers.JsonRpcProvider(rpcUrl);
		this.contract = new ethers.Contract(contractAddress, orderbookAbi.abi, provider);

		// Initialize storage middlewares
		this.orderStorageService = new OrderStorageService(contractAddress, dbConfig);
		this.tradeStorageService = new TradeStorageService(contractAddress, dbConfig);
		this.orderBookStorageService = new OrderBookStorageService(contractAddress, dbConfig);

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

	async listenForOrderEvents() {
		try {
			setInterval(() => {
				this.contract.on(
					"OrderCreated",
					async (
						orderId: number,
						ownerAddress: string,
						size: number,
						price: number,
						isBuy: boolean,
						event: ethers.Log
					) => {
						const txHash = (await event.getTransaction()).hash;
						console.log(
							`OrderCreated event detected for orderId: ${orderId} owner: ${ownerAddress} price: ${price} size: ${size} isBuy: ${isBuy} txHash: ${txHash}`
						);
		
						await this.saveOrder(orderId, ownerAddress, size, price, isBuy);
						console.log(`Order Saved: ${orderId}`);
					}
				);
		
				this.contract.on(
					"OrderUpdated",
					async (orderId: number, updatedSize: number, takerAddress: string, filledSize: number, event: ethers.Log) => {
						const txHash = (await event.getTransaction()).hash;
						console.log(
							`OrderUpdated event detected for orderIds: ${orderId} updatedSizes: ${updatedSize}`
						);
		
						await this.tradeStorageService.addTrade(takerAddress, orderId, filledSize, Date.now())
		
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
					async (orderIds: number[], updatedSizes: number[], event: ethers.Log) => {
						const txHash = (await event.getTransaction()).hash;
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
		
				this.contract.on("OrdersCanceled", async (orderIds: number[], event: ethers.Log) => {
					const txHash = (await event.getTransaction()).hash;
					console.log(`OrdersCanceled event detected for orderId: ${orderIds}`);
		
					await this.orderBookStorageService.deleteOrders(orderIds);
					console.log(`Order Deleted: ${orderIds}`);
				});
			}, 500)

		} catch (err) {
			console.log(`Error listening to events on market ${err}`)
		}
	}
}

export default MarketListener;
