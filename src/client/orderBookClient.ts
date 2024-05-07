import { ethers } from "ethers";
import { Contract } from "ethers";
import OrderBookService from "../services/orderbookService";

class OrderbookClient {
	private provider: ethers.JsonRpcProvider;
	private wallet: ethers.Wallet;
	private orderbook: Contract;
    private baseToken: Contract;
    private quoteToken: Contract;

	constructor(
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
	}

    async approveBase(size: number): Promise<void> {
        const tx = await this.baseToken.approve(await this.orderbook.getAddress(), size);
		await tx.wait();
		console.log("Base tokens approved:");
    }

    async approveQuote(size: number): Promise<void> {
        const tx = await this.quoteToken.approve(await this.orderbook.getAddress(), size);
		await tx.wait();
		console.log("Quote tokens approved");
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

	async placeFillOrKill(
		size: number,
		isBuy: boolean
	): Promise<number> {
		return isBuy
			? this.placeAndExecuteMarketBuy(size, true)
			: this.placeAndExecuteMarketSell(size, true);
	}

	async placeMarket(
		size: number,
		isBuy: boolean
	): Promise<number> {
		return isBuy
			? this.placeAndExecuteMarketBuy(size, false)
			: this.placeAndExecuteMarketSell(size, false);
	}

	async addBuyOrder(price: number, size: number): Promise<void> {
		const tx = await this.orderbook.addBuyOrder(price, size);
		await tx.wait();
		console.log("Buy order added:");
	}

	async addSellOrder(price: number, size: number): Promise<void> {
		const tx = await this.orderbook.addSellOrder(price, size);
		await tx.wait();
		console.log("Sell order added:");
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
		console.log("Multiple buy orders placed:");
	}

	async placeMultipleSellOrders(
		prices: number[],
		sizes: number[]
	): Promise<void> {
		const tx = await this.orderbook.placeMultipleSellOrders(prices, sizes);
		await tx.wait();
		console.log("Multiple sell orders placed:");
	}

	async cancelOrders(orderIds: number[]): Promise<void> {
		const tx = await this.orderbook.batchCancelOrders(orderIds);
		await tx.wait();
		console.log("Batch orders cancelled:", orderIds);
	}

	async replaceOrders(orderIds: number[], prices: number[]): Promise<void> {
		const tx = await this.orderbook.replaceOrders(orderIds, prices);
		await tx.wait();
		console.log("Orders replaced:");
	}

	async placeAndExecuteMarketBuy(
		size: number,
		isFillOrKill: boolean
	): Promise<number> {
		const tx = await this.orderbook.placeAndExecuteMarketBuy(
			size,
			isFillOrKill
		);
		await tx.wait();
		console.log("Market buy order executed:");
		return tx.value; // Assuming the function returns the remaining size
	}

	async placeAndExecuteMarketSell(
		size: number,
		isFillOrKill: boolean
	): Promise<number> {
		const tx = await this.orderbook.placeAndExecuteMarketSell(
			size,
			isFillOrKill
		);
		await tx.wait();
		console.log("Market sell order executed:");
		return tx.value; // Assuming the function returns the remaining size
	}

	async getL2OrderBook() {
		const data = await this.orderbook.getL2Book();

		// Decode the data
		let offset = 66;
		const blockNumber = parseInt('0x' + data.slice(2, 66), 16);
		let asks = {};
		while (offset < data.length) {
		  const price = parseInt('0x' + data.slice(offset, offset + 64), 16);
		  offset += 64;  // Each uint24 is padded to 64 bytes
		  if (price == 0) {
			  break
		  }
		  const size = parseInt('0x' + data.slice(offset, offset + 64), 16);
		  offset += 64; // Each uint96 is padded to 64 bytes
		//   asks[price.toString()] = size.toString();
		}
	  
		let bids = {};
	  
		while (offset < data.length) {
		  const price = parseInt('0x' + data.slice(offset, offset + 64), 16);
		  offset += 64;  // Each uint24 is padded to 64 bytes
		  const size = parseInt('0x' + data.slice(offset, offset + 64), 16);
		  offset += 64; // Each uint96 is padded to 64 bytes
		//   bids[price.toString()] = size.toString();
		}
	}
}

export default OrderbookClient;
