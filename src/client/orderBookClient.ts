import { ethers, BigNumber } from "ethers";
import { Contract } from "ethers";

import {OrderBookData, ActiveOrders, MarketParams, Order} from "../types/types";
import orderbookAbi from "../../abi/OrderBook.json";
import erc20Abi from "../../abi/IERC20.json";

export class OrderbookClient {
	private provider: ethers.providers.JsonRpcProvider;
	private wallet: ethers.Wallet;
	private orderbook: Contract;
    private baseToken: Contract;
    private quoteToken: Contract;
	private marketParams: MarketParams;

	private constructor(
        provider: ethers.providers.JsonRpcProvider,
        wallet: ethers.Wallet,
        orderbook: ethers.Contract,
        baseToken: ethers.Contract,
        quoteToken: ethers.Contract,
        marketParams: MarketParams
    ) {
        this.provider = provider;
        this.wallet = wallet;
        this.orderbook = orderbook;
        this.baseToken = baseToken;
        this.quoteToken = quoteToken;
        this.marketParams = marketParams;
    }

	/**
     * @dev Creates an instance of OrderbookClient.
     * @param privateKey - The private key of the wallet.
     * @param rpcUrl - The RPC URL of the Ethereum node.
     * @param orderbookAddress - The address of the orderbook contract.
     * @returns A promise that resolves to an instance of OrderbookClient.
     */
    static async create(
        privateKey: string,
        rpcUrl: string,
        orderbookAddress: string,
    ): Promise<OrderbookClient> {
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, wallet);

        const marketParamsData = await orderbook.getMarketParams();
        const marketParams: MarketParams = {
            pricePrecision: BigNumber.from(marketParamsData[0]),
            sizePrecision: BigNumber.from(marketParamsData[1]),
            baseAssetAddress: marketParamsData[2],
            baseAssetDecimals: BigNumber.from(marketParamsData[3]),
            quoteAssetAddress: marketParamsData[4],
            quoteAssetDecimals: BigNumber.from(marketParamsData[5]),
        };

        const baseToken = new ethers.Contract(marketParams.baseAssetAddress, erc20Abi.abi, wallet);
        const quoteToken = new ethers.Contract(marketParams.quoteAssetAddress, erc20Abi.abi, wallet);

        return new OrderbookClient(provider, wallet, orderbook, baseToken, quoteToken, marketParams);
    }

	/**
     * @dev Returns the market parameters.
     * @returns The market parameters.
     */
	getMarketParams(): MarketParams {
        return this.marketParams;
    }

	/**
     * @dev Approves base tokens for spending by the orderbook contract.
     * @param size - The size of the tokens to approve.
     * @returns A promise that resolves when the transaction is confirmed.
     */
    async approveBase(size: number): Promise<void> {
        const tx = await this.baseToken.approve(
			this.orderbook.address,
			ethers.utils.parseUnits(
				size.toString(),
				this.marketParams.baseAssetDecimals
			)
		);
		await tx.wait();
		console.log("Base tokens approved:");
    }

	/**
     * @dev Approves quote tokens for spending by the orderbook contract.
     * @param size - The size of the tokens to approve.
     * @returns A promise that resolves when the transaction is confirmed.
     */
    async approveQuote(size: number): Promise<void> {
        const tx = await this.quoteToken.approve(
			this.orderbook.address,
			ethers.utils.parseUnits(
				size.toString(),
				this.marketParams.quoteAssetDecimals
			)
		);
		await tx.wait();
		console.log("Quote tokens approved");
    }

    /**
	 * @dev Estimates the gas required to place a limit order.
	 * @param {number} size - The size of the order.
	 * @returns {Promise<number>} - A promise that resolves to the estimated gas required for the transaction.
	 */
	async estimateGasForApproval(
		size: number,
        isBase: boolean
	): Promise<BigNumber> {
		// Encode the function call
		const encodeData = isBase ? ethers.utils.parseUnits(size.toString(), this.marketParams.baseAssetDecimals) : ethers.utils.parseUnits(size.toString(), this.marketParams.quoteAssetDecimals);
		const data = this.quoteToken.interface.encodeFunctionData(
			"approve",
			[this.orderbook.address, encodeData]
		);

		// Create the transaction object
		const transaction = {
			to: isBase ? this.baseToken.address : this.quoteToken.address,
			data: data,
		};

		// Estimate gas
		const estimatedGas = await this.provider.estimateGas(transaction);

		return estimatedGas;
	}

	/**
     * @dev Places a limit order.
     * @param price - The price at which the limit order is to be placed.
     * @param size - The size of the order.
     * @param isBuy - A boolean indicating whether it's a buy order (true) or sell order (false).
     * @param postOnly - A boolean indicating whether the order should be post-only.
     * @returns A promise that resolves to a boolean indicating success or failure.
     */
	async placeLimit(price: number, size: number, isBuy: boolean, postOnly: boolean): Promise<boolean> {
		return isBuy
			? this.addBuyOrder(price, size, postOnly)
			: this.addSellOrder(price, size, postOnly);
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
	): Promise<BigNumber> {
		// Make sure the function name and arguments match the contract
		const functionName = isBuy ? "addBuyOrder" : "addSellOrder";
		const args = [
			ethers.utils.parseUnits(price.toString(), this.log10BigNumber(this.marketParams.pricePrecision)),
			ethers.utils.parseUnits(size.toString(), this.log10BigNumber(this.marketParams.sizePrecision))
		];

		// Encode the function call
		const data = this.orderbook.interface.encodeFunctionData(
			functionName,
			args
		);

		// Create the transaction object
		const transaction = {
			to: this.orderbook.address,
			data: data,
		};

		// Estimate gas
		const estimatedGas = await this.provider.estimateGas(transaction);

		return estimatedGas;
	}

	/**
     * @dev Places a fill-or-kill order.
     * @param size - The size of the order.
     * @param isBuy - A boolean indicating whether it's a buy order (true) or sell order (false).
     * @returns A promise that resolves to the credited size.
     */
	async placeFillOrKill(
		size: number,
		isBuy: boolean
	): Promise<number> {
		return isBuy
			? this.placeAndExecuteMarketBuy(size, true)
			: this.placeAndExecuteMarketSell(size, true);
	}

	/**
     * @dev Places a market order.
     * @param size - The size of the order.
     * @param isBuy - A boolean indicating whether it's a buy order (true) or sell order (false).
     * @returns A promise that resolves to the credited size.
     */
	async placeMarket(
		size: number,
		isBuy: boolean
	): Promise<number> {
		return isBuy
			? this.placeAndExecuteMarketBuy(size, false)
			: this.placeAndExecuteMarketSell(size, false);
	}

	/**
     * @dev Adds a buy order.
     * @param price - The price at which the buy order is to be placed.
     * @param size - The size of the order.
     * @param postOnly - A boolean indicating whether the order should be post-only.
     * @returns A promise that resolves to a boolean indicating success or failure.
     */
	async addBuyOrder(price: number, size: number, postOnly: boolean): Promise<boolean> {
		try {
			const tx = await this.orderbook.addBuyOrder(
				ethers.utils.parseUnits(price.toString(), this.log10BigNumber(this.marketParams.pricePrecision)),
				ethers.utils.parseUnits(size.toString(), this.log10BigNumber(this.marketParams.sizePrecision)),
				postOnly
			);
			await tx.wait();
			console.log("Buy order added:");
			return true; // Return true if the transaction is successful
		} catch (error: any) {
			if (error.message.includes("OrderBook: Post only crossed the book")) {
				console.error("Failed to add buy order: Post only crossed the book");
				return false; // Return false if the specific error is caught
			} else {
				// Log and possibly rethrow or handle other types of errors differently
				console.error(`An error occurred: ${error.message}`);
				throw error; // Rethrow the error if it's not the specific case we're looking for
			}
		}
	}	

	/**
     * @dev Adds a sell order.
     * @param price - The price at which the sell order is to be placed.
     * @param size - The size of the order.
     * @param postOnly - A boolean indicating whether the order should be post-only.
     * @returns A promise that resolves to a boolean indicating success or failure.
     */
	async addSellOrder(price: number, size: number, postOnly: boolean): Promise<boolean> {
		try {
			const tx = await this.orderbook.addSellOrder(
				ethers.utils.parseUnits(price.toString(), this.log10BigNumber(this.marketParams.pricePrecision)),
				ethers.utils.parseUnits(size.toString(), this.log10BigNumber(this.marketParams.sizePrecision)),
				postOnly
			);
			await tx.wait();
			console.log("Sell order added:");
			return true; // Return true if the transaction is successful
		} catch (error: any) {
			if (error.message.includes("OrderBook: Post only crossed the book")) {
				console.error("Failed to add buy order: Post only crossed the book");
				return false; // Return false if the specific error is caught
			} else {
				// Log and possibly rethrow or handle other types of errors differently
				console.error(`An error occurred: ${error.message}`);
				throw error; // Rethrow the error if it's not the specific case we're looking for
			}
		}
	}

	/**
     * @dev Places multiple limit orders.
     * @param prices - An array of prices for the orders.
     * @param sizes - An array of sizes for the orders.
     * @param isBuy - A boolean indicating whether these are buy orders (true) or sell orders (false).
     * @param postOnly - A boolean indicating whether the orders should be post-only.
     * @returns A promise that resolves when the transaction is confirmed.
     */
	async placeLimits(
		prices: number[],
		sizes: number[],
		isBuy: boolean,
		postOnly: boolean
	): Promise<void> {
		return isBuy
			? this.placeMultipleBuyOrders(prices, sizes, postOnly)
			: this.placeMultipleSellOrders(prices, sizes, postOnly);
	}

	/**
     * @dev Places multiple buy orders.
     * @param prices - An array of prices for the buy orders.
     * @param sizes - An array of sizes for the buy orders.
     * @param postOnly - A boolean indicating whether the orders should be post-only.
     * @returns A promise that resolves when the transaction is confirmed.
     */
	async placeMultipleBuyOrders(
		prices: number[],
		sizes: number[],
		postOnly: boolean
	): Promise<void> {
		const tx = await this.orderbook.placeMultipleBuyOrders(
			prices.map(price => ethers.utils.parseUnits(price.toString(), this.log10BigNumber(this.marketParams.pricePrecision))),
			sizes.map(size => ethers.utils.parseUnits(size.toString(), this.log10BigNumber(this.marketParams.sizePrecision))),
			postOnly
		);
		await tx.wait();
		console.log("Multiple buy orders placed:");
	}

	/**
     * @dev Places multiple sell orders.
     * @param prices - An array of prices for the sell orders.
     * @param sizes - An array of sizes for the sell orders.
     * @param postOnly - A boolean indicating whether the orders should be post-only.
     * @returns A promise that resolves when the transaction is confirmed.
     */
	async placeMultipleSellOrders(
		prices: number[],
		sizes: number[],
		postOnly: boolean
	): Promise<void> {
		const tx = await this.orderbook.placeMultipleSellOrders(
			prices.map(
				price => ethers.utils.parseUnits(
					price.toString(),
					this.log10BigNumber(this.marketParams.pricePrecision)
				)
			),
			sizes.map(
				size => ethers.utils.parseUnits(
					size.toString(),
					this.log10BigNumber(this.marketParams.sizePrecision)
				)
			),
			postOnly
		);
		await tx.wait();
		console.log("Multiple sell orders placed:");
	}

	/**
     * @dev Cancels multiple orders.
     * @param orderIds - An array of order IDs to be cancelled.
     * @returns A promise that resolves when the transaction is confirmed.
     */
	async cancelOrders(orderIds: BigNumber[]): Promise<void> {
		const tx = await this.orderbook.batchCancelOrders(orderIds);
		await tx.wait();
		console.log("Batch orders cancelled:", orderIds);
	}

	/**
     * @dev Cancels all orders for a specific maker.
     * @param maker - The address of the maker whose orders should be cancelled.
     * @returns A promise that resolves when the transaction is confirmed.
     */
	async cancelAllOrders(maker: string): Promise<void> {
		const activeOrders = await this.getActiveOrdersForMaker(maker);

		await this.cancelOrders(activeOrders.orderIds);
		
		console.log(`Cancelled orderIds ${activeOrders.orderIds} for:`, maker);
	}

	/**
     * @dev Cancels all buy orders for a specific maker.
     * @param maker - The address of the maker whose buy orders should be cancelled.
     * @returns A promise that resolves when the transaction is confirmed.
     */
	async cancelAllBuys(maker: string): Promise<void> {
		const activeOrders = await this.getActiveBuysForMaker(maker);

		await this.cancelOrders(activeOrders.orderIds);
		
		console.log(`Cancelled orderIds ${activeOrders.orderIds} for:`, maker);
	}

	/**
     * @dev Cancels all sell orders for a specific maker.
     * @param maker - The address of the maker whose sell orders should be cancelled.
     * @returns A promise that resolves when the transaction is confirmed.
     */
	async cancelAllSells(maker: string): Promise<void> {
		const activeOrders = await this.getActiveSellsForMaker(maker);

		await this.cancelOrders(activeOrders.orderIds);
		
		console.log(`Cancelled orderIds ${activeOrders.orderIds} for:`, maker);
	}

	/**
     * @dev Places and executes a market buy order.
     * @param quoteSize - The size of the quote asset.
     * @param isFillOrKill - A boolean indicating whether the order should be fill-or-kill.
     * @returns A promise that resolves to the credited size.
     */
	async placeAndExecuteMarketBuy(
		quoteSize: number,
		isFillOrKill: boolean
	): Promise<number> {
		const tx = await this.orderbook.placeAndExecuteMarketBuy(
			ethers.utils.parseUnits(quoteSize.toString(), this.log10BigNumber(this.marketParams.pricePrecision)),
			isFillOrKill
		);
		await tx.wait();
		console.log("Market buy order executed:");
		return tx.value;
	}

	/**
     * @dev Places and executes a market sell order.
     * @param size - The size of the base asset.
     * @param isFillOrKill - A boolean indicating whether the order should be fill-or-kill.
     * @returns A promise that resolves to the remaining size.
     */
	async placeAndExecuteMarketSell(
		size: number,
		isFillOrKill: boolean
	): Promise<number> {
		const tx = await this.orderbook.placeAndExecuteMarketSell(
			ethers.utils.parseUnits(size.toString(), this.log10BigNumber(this.marketParams.sizePrecision)),
			isFillOrKill
		);
		await tx.wait();
		console.log("Market sell order executed:");
		return tx.value;
	}

	/**
     * @dev Gets active orders for a specific maker.
     * @param maker - The address of the maker.
     * @returns A promise that resolves to an ActiveOrders object.
     */
	async getActiveOrdersForMaker(maker: string): Promise<ActiveOrders> {
        const data = await this.orderbook.getActiveOrdersForAddress(maker);
        let offset = 66;
        const blockNumber = parseInt(data.slice(2, 66), 16);  // Extracting the block number from data
        let orderIds: BigNumber[] = [];
        
        while (offset < data.length) {
            const orderId = BigNumber.from(parseInt(data.slice(offset, offset + 64), 16));
            offset += 64; // Each uint24 is padded to 64 bytes
            orderIds.push(orderId);
        }

        return { blockNumber, orderIds };
    }

	/**
     * @dev Gets an order by its ID.
     * @param orderId - The ID of the order.
     * @returns A promise that resolves to an Order object.
     */
	async getOrder(orderId: number): Promise<Order> {
		const order: Order = await this.orderbook.s_orders(orderId);

		return order;
	}

	/**
     * @dev Checks if an order is a buy order.
     * @param orderId - The ID of the order.
     * @returns A promise that resolves to a boolean indicating if the order is a buy order.
     */
	async isBuyOrder(orderId: number): Promise<boolean> {
		const order: Order = await this.orderbook.s_orders(orderId);

		return order.isBuy;
	}

	/**
     * @dev Gets active buy orders for a specific maker.
     * @param maker - The address of the maker.
     * @returns A promise that resolves to an ActiveOrders object.
     */
	async getActiveBuysForMaker(maker: string): Promise<ActiveOrders> {
        const data = await this.orderbook.getActiveBuysForAddress(maker);
        let offset = 66;
        const blockNumber = parseInt(data.slice(2, 66), 16);  // Extracting the block number from data
        let orderIds: BigNumber[] = [];
        
        while (offset < data.length) {
            const orderId = BigNumber.from(parseInt(data.slice(offset, offset + 64), 16));
            offset += 64; // Each uint24 is padded to 64 bytes
            orderIds.push(orderId);
        }

        return { blockNumber, orderIds };
    }

	/**
     * @dev Gets active sell orders for a specific maker.
     * @param maker - The address of the maker.
     * @returns A promise that resolves to an ActiveOrders object.
     */
	async getActiveSellsForMaker(maker: string): Promise<ActiveOrders> {
        const data = await this.orderbook.getActiveSellsForAddress(maker);
        let offset = 66;
        const blockNumber = parseInt(data.slice(2, 66), 16);  // Extracting the block number from data
        let orderIds: BigNumber[] = [];
        
        while (offset < data.length) {
            const orderId = BigNumber.from(parseInt(data.slice(offset, offset + 64), 16));
            offset += 64; // Each uint24 is padded to 64 bytes
            orderIds.push(orderId);
        }

        return { blockNumber, orderIds };
    }

	/**
     * @dev Gets the order book data.
     * @returns A promise that resolves to an OrderBookData object.
     */
	async getL2OrderBook(): Promise<OrderBookData> {
		const data = await this.orderbook.getL2Book();
	
		let offset = 66; // Start reading after the block number
		const blockNumber = parseInt(data.slice(2, 66), 16); // The block number is stored in the first 64 bytes after '0x'
	
		let bids: Record<string, string> = {};
		let asks: Record<string, string> = {};
	
		// Decode bids
		while (offset < data.length) {
			const price = parseInt(data.slice(offset, offset + 64), 16);
			offset += 64; // Skip over padding
			if (price === 0) {
				break; // Stop reading if price is zero
			}
			const size = parseInt(data.slice(offset, offset + 64), 16);
			offset += 64; // Skip over padding
			bids[
				ethers.utils.formatUnits(
					price,
					this.log10BigNumber(this.marketParams.pricePrecision)
				)
			] = ethers.utils.formatUnits(size, this.log10BigNumber(this.marketParams.sizePrecision));
		}
	
		// Decode asks
		while (offset < data.length) {
			const price = parseInt(data.slice(offset, offset + 64), 16);
			offset += 64; // Skip over padding
			const size = parseInt(data.slice(offset, offset + 64), 16);
			offset += 64; // Skip over padding
			asks[
				ethers.utils.formatUnits(
					price,
					this.log10BigNumber(this.marketParams.pricePrecision)
				)
			] = ethers.utils.formatUnits(size, this.log10BigNumber(this.marketParams.sizePrecision));
		}
	
		return { bids, asks, blockNumber };
	}

	/**
	 * @dev Estimates the expected amount of tokens to be received for a market order (buy/sell).
	 * @param size - The size of the order.
	 * @returns A promise that resolves to the estimated amount of tokens to be received.
	 */
	async estimateMarketSell(
		size: number,
	): Promise<number> {
		const l2OrderBook = await this.getL2OrderBook();

		let remainingSize = size;
		let receivedAmount = 0;
		const orders = l2OrderBook.bids;

		for (const [price, orderSize] of Object.entries(orders)) {
			const orderSizeFloat = parseFloat(orderSize);
			const priceFloat = parseFloat(price);

			if (remainingSize <= 0) {
				break;
			}

			if (remainingSize >= orderSizeFloat) {
				receivedAmount += orderSizeFloat * priceFloat;
				remainingSize -= orderSizeFloat;
			} else {
				receivedAmount += remainingSize * priceFloat;
				remainingSize = 0;
			}
		}

		return receivedAmount;
	}

	/**
	 * @dev Estimates the expected size of base tokens to be received for a given amount of quote tokens in a market buy order.
	 * @param quoteAmount - The amount of quote tokens available for the buy order.
	 * @returns A promise that resolves to the estimated size of base tokens.
	 */
	async estimateMarketBuy(
		quoteAmount: number
	): Promise<number> {
		const l2OrderBook = await this.getL2OrderBook();

		let remainingQuote = quoteAmount;
		let baseTokensReceived = 0;

		for (const [price, orderSize] of Object.entries(l2OrderBook.asks)) {
			const orderSizeFloat = parseFloat(orderSize);
			const priceFloat = parseFloat(price);

			if (remainingQuote <= 0) {
				break;
			}

			const orderValueInQuote = orderSizeFloat * priceFloat;

			if (remainingQuote >= orderValueInQuote) {
				baseTokensReceived += orderSizeFloat;
				remainingQuote -= orderValueInQuote;
			} else {
				baseTokensReceived += remainingQuote / priceFloat;
				remainingQuote = 0;
			}
		}

		return baseTokensReceived;
	}

	/**
     * @dev Calculates the base-10 logarithm of a BigNumber.
     * @param bn - The BigNumber to calculate the logarithm of.
     * @returns The base-10 logarithm of the BigNumber.
     */
	log10BigNumber(bn: BigNumber): number {
		if (bn.isZero()) {
			throw new Error("Log10 of zero is undefined");
		}
	
		const bnString = bn.toString();
		return bnString.length - 1;
	}
}
