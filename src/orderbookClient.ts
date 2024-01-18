import { ethers } from "ethers";
import { Contract } from "ethers";
import OrderBookService from "./orderbookService";

class OrderbookClient {
	private provider: ethers.JsonRpcProvider;
	private wallet: ethers.Wallet;
	private orderbook: Contract;
    private baseToken: Contract;
    private quoteToken: Contract;
	// we take an orderbook service and not a dbConfig here because we assume the orderbook service can have different storages.
	// dbConfig is on of them that has been implemented currently, but the the storage service will be enhanced.
	private orderbookService: OrderBookService | null;

	constructor(
		orderbookService: OrderBookService | null,
		privateKey: string,
		rpcUrl: string,
		orderbookAddress: string,
		orderbookABI: any,
		baseTokenAddress: string,
		quoteTokenAddress: string,
		ERC20ABI: any
	) {
		this.provider = new ethers.JsonRpcProvider(rpcUrl);
		this.wallet = new ethers.Wallet(privateKey, this.provider);

		this.orderbook = new ethers.Contract(
			orderbookAddress,
			orderbookABI,
			this.wallet
		);

        this.baseToken = new ethers.Contract(
            baseTokenAddress,
            ERC20ABI,
            this.wallet,
        )

        this.quoteToken = new ethers.Contract(
            quoteTokenAddress,
            ERC20ABI,
            this.wallet,
        )

		this.orderbookService = new OrderBookService(orderbookService);
	}

    async approveBase(size: number): Promise<void> {
        const tx = await this.baseToken.approve(await this.orderbook.getAddress(), size);
		await tx.wait();
		console.log("Base tokens approved:", tx);
    }

    async approveQuote(size: number): Promise<void> {
        const tx = await this.quoteToken.approve(await this.orderbook.getAddress(), size);
		await tx.wait();
		console.log("Quote tokens approved", tx);
    }

    /**
	 * @dev Estimates the gas required to place a limit order.
	 * @param {number} price - The price at which the limit order is to be placed.
	 * @param {number} size - The size of the order.
	 * @param {boolean} isBuy - A boolean indicating whether it's a buy order (true) or sell order (false).
	 * @returns {Promise<number>} - A promise that resolves to the estimated gas required for the transaction.
	 */
	async estimateGasForApproval(
		size: number,
        isBase: boolean
	): Promise<bigint> {
		// Encode the function call
		const data = this.orderbook.interface.encodeFunctionData(
			"approve",
			[await this.orderbook.getAddress(), size]
		);

		// Create the transaction object
		const transaction = {
			to: isBase ? await this.baseToken.getAddress() : await this.quoteToken.getAddress(),
			data: data,
		};

		// Estimate gas
		const estimatedGas = await this.provider.estimateGas(transaction);

		return estimatedGas;
	}

	async placeLimit(price: number, size: number, isBuy: boolean): Promise<void> {
		return isBuy
			? this.addBuyOrder(price, size)
			: this.addSellOrder(price, size);
	}

	/**
	 * @dev Estimates the gas required to place a limit order.
	 * @param {number} price - The price at which the limit order is to be placed.
	 * @param {number} size - The size of the order.
	 * @param {boolean} isBuy - A boolean indicating whether it's a buy order (true) or sell order (false).
	 * @returns {Promise<number>} - A promise that resolves to the estimated gas required for the transaction.
	 */
	async estimateGasForLimitOrder(
		price: number,
		size: number,
		isBuy: boolean
	): Promise<bigint> {
		// Make sure the function name and arguments match the contract
		const functionName = isBuy ? "addBuyOrder" : "addSellOrder";
		const args = [price, size]; // Adjust the arguments as per the contract method

		// Encode the function call
		const data = this.orderbook.interface.encodeFunctionData(
			functionName,
			args
		);

		// Create the transaction object
		const transaction = {
			to: this.orderbook.getAddress(),
			data: data,
		};

		// Estimate gas
		const estimatedGas = await this.provider.estimateGas(transaction);

		return estimatedGas;
	}

	async placeAggressiveLimit(
		price: number,
		size: number,
		isBuy: boolean
	): Promise<void> {
		return isBuy
			? this.addBuyOrder(price, size)
			: this.addSellOrder(price, size);
	}

	async placeFillOrKill(
		size: number,
		bufferPercent: number,
		isBuy: boolean
	): Promise<number> {
		const orderIds: number[] = isBuy
			? (await this.orderbookService?.getSellOrdersForSize(
					size,
					bufferPercent
			  )) || []
			: (await this.orderbookService?.getBuyOrdersForSize(
					size,
					bufferPercent
			  )) || [];

		return isBuy
			? this.placeAndExecuteMarketBuy(orderIds, size, true)
			: this.placeAndExecuteMarketSell(orderIds, size, true);
	}

	async placeMarket(
		size: number,
		bufferPercent: number,
		isBuy: boolean
	): Promise<number> {
		const orderIds: number[] = isBuy
			? (await this.orderbookService?.getSellOrdersForSize(
					size,
					bufferPercent
			  )) || []
			: (await this.orderbookService?.getBuyOrdersForSize(
					size,
					bufferPercent
			  )) || [];

		return isBuy
			? this.placeAndExecuteMarketBuy(orderIds, size, false)
			: this.placeAndExecuteMarketSell(orderIds, size, false);
	}

	async addBuyOrder(price: number, size: number): Promise<void> {
		const tx = await this.orderbook.addBuyOrder(price, size);
		await tx.wait();
		console.log("Buy order added:", tx);
	}

	async addSellOrder(price: number, size: number): Promise<void> {
		const tx = await this.orderbook.addSellOrder(price, size);
		await tx.wait();
		console.log("Sell order added:", tx);
	}

	async placeLimits(
		prices: number[],
		sizes: number[],
		isBuy: boolean
	): Promise<void> {
		return isBuy
			? this.placeMultipleBuyOrders(prices, sizes)
			: this.placeMultipleSellOrders(prices, sizes);
	}

	async placeMultipleBuyOrders(
		prices: number[],
		sizes: number[]
	): Promise<void> {
		const tx = await this.orderbook.placeMultipleBuyOrders(prices, sizes);
		await tx.wait();
		console.log("Multiple buy orders placed:", tx);
	}

	async placeMultipleSellOrders(
		prices: number[],
		sizes: number[]
	): Promise<void> {
		const tx = await this.orderbook.placeMultipleSellOrders(prices, sizes);
		await tx.wait();
		console.log("Multiple sell orders placed:", tx);
	}

	async cancelOrders(orderIds: number[], isBuy: boolean[]): Promise<void> {
		const tx = await this.orderbook.batchCancelOrders(orderIds, isBuy);
		await tx.wait();
		console.log("Batch orders cancelled:", tx);
	}

	async replaceOrders(orderIds: number[], prices: number[]): Promise<void> {
		const tx = await this.orderbook.replaceOrders(orderIds, prices);
		await tx.wait();
		console.log("Orders replaced:", tx);
	}

	async placeAndExecuteMarketBuy(
		orderIds: number[],
		size: number,
		isFillOrKill: boolean
	): Promise<number> {
		const tx = await this.orderbook.placeAndExecuteMarketBuy(
			orderIds,
			size,
			isFillOrKill
		);
		await tx.wait();
		console.log("Market buy order executed:", tx);
		return tx.value; // Assuming the function returns the remaining size
	}

	async placeAndExecuteMarketSell(
		orderIds: number[],
		size: number,
		isFillOrKill: boolean
	): Promise<number> {
		const tx = await this.orderbook.placeAndExecuteMarketSell(
			orderIds,
			size,
			isFillOrKill
		);
		await tx.wait();
		console.log("Market sell order executed:", tx);
		return tx.value; // Assuming the function returns the remaining size
	}

	async placeAggressiveLimitSell(
		orderIds: number[],
		size: number,
		price: number
	): Promise<void> {
		const tx = await this.orderbook.placeAggressiveLimitSell(
			orderIds,
			size,
			price
		);
		await tx.wait();
		console.log("Aggressive limit sell order placed:", tx);
	}

	async placeAggressiveLimitBuy(
		orderIds: number[],
		size: number,
		price: number
	): Promise<void> {
		const tx = await this.orderbook.placeAggressiveLimitBuy(
			orderIds,
			size,
			price
		);
		await tx.wait();
		console.log("Aggressive limit buy order placed:", tx);
	}
}

export default OrderbookClient;
