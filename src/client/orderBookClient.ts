import { ethers } from "ethers";
import { Contract } from "ethers";

import {OrderBookData, ActiveOrders, MarketParams, Order} from "../types/types";
import orderbookAbi from "../../abi/OrderBook.json";
import erc20Abi from "../../abi/IERC20.json";

export class OrderbookClient {
	private provider: ethers.JsonRpcProvider;
	private wallet: ethers.Wallet;
	private orderbook: Contract;
    private baseToken: Contract;
    private quoteToken: Contract;
	private marketParams: MarketParams;

	private constructor(
        provider: ethers.JsonRpcProvider,
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

    static async create(
        privateKey: string,
        rpcUrl: string,
        orderbookAddress: string,
    ): Promise<OrderbookClient> {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, wallet);

        const marketParamsData = await orderbook.getMarketParams();
        const marketParams: MarketParams = {
            pricePrecision: Number(marketParamsData[0]),
            sizePrecision: Number(marketParamsData[1]),
            baseAssetAddress: marketParamsData[2],
            baseAssetDecimals: Number(marketParamsData[3]),
            quoteAssetAddress: marketParamsData[4],
            quoteAssetDecimals: Number(marketParamsData[5]),
        };

        const baseToken = new ethers.Contract(marketParams.baseAssetAddress, erc20Abi.abi, wallet);
        const quoteToken = new ethers.Contract(marketParams.quoteAssetAddress, erc20Abi.abi, wallet);

        return new OrderbookClient(provider, wallet, orderbook, baseToken, quoteToken, marketParams);
    }

	getMarketParams(): MarketParams {
        return this.marketParams;
    }

    async approveBase(size: number): Promise<void> {
        const tx = await this.baseToken.approve(await this.orderbook.getAddress(), Math.round(size * 10**this.marketParams.baseAssetDecimals));
		await tx.wait();
		console.log("Base tokens approved:");
    }

    async approveQuote(size: number): Promise<void> {
        const tx = await this.quoteToken.approve(await this.orderbook.getAddress(),  Math.round(size * 10**this.marketParams.quoteAssetDecimals));
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
	): Promise<bigint> {
		// Encode the function call
		const encodeData = isBase ? Math.round(size * 10**this.marketParams.baseAssetDecimals) : Math.round(size * 10**this.marketParams.quoteAssetDecimals);
		const data = this.quoteToken.interface.encodeFunctionData(
			"approve",
			[await this.orderbook.getAddress(), encodeData]
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
	): Promise<bigint> {
		// Make sure the function name and arguments match the contract
		const functionName = isBuy ? "addBuyOrder" : "addSellOrder";
		const args = [Math.round(price * this.marketParams.pricePrecision), Math.round(size * this.marketParams.sizePrecision)];

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

	async addBuyOrder(price: number, size: number, postOnly: boolean): Promise<boolean> {
		try {
			const tx = await this.orderbook.addBuyOrder(
				Math.round(price * this.marketParams.pricePrecision),
				Math.round(size * this.marketParams.sizePrecision),
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

	async addSellOrder(price: number, size: number, postOnly: boolean): Promise<boolean> {
		try {
			const tx = await this.orderbook.addSellOrder(
				Math.round(price * this.marketParams.pricePrecision),
				Math.round(size * this.marketParams.sizePrecision),
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

	async placeMultipleBuyOrders(
		prices: number[],
		sizes: number[],
		postOnly: boolean
	): Promise<void> {
		const tx = await this.orderbook.placeMultipleBuyOrders(
			prices.map(price => Math.round(price * this.marketParams.pricePrecision)),
			sizes.map(size => Math.round(size * this.marketParams.sizePrecision)),
			postOnly
		);
		await tx.wait();
		console.log("Multiple buy orders placed:");
	}

	async placeMultipleSellOrders(
		prices: number[],
		sizes: number[],
		postOnly: boolean
	): Promise<void> {
		const tx = await this.orderbook.placeMultipleSellOrders(
			prices.map(price => Math.round(price * this.marketParams.pricePrecision)),
			sizes.map(size => Math.round(size * this.marketParams.sizePrecision)),
			postOnly
		);
		await tx.wait();
		console.log("Multiple sell orders placed:");
	}

	async cancelOrders(orderIds: number[]): Promise<void> {
		const tx = await this.orderbook.batchCancelOrders(orderIds);
		await tx.wait();
		console.log("Batch orders cancelled:", orderIds);
	}

	async cancelAllOrders(maker: string): Promise<void> {
		const activeOrders = await this.getActiveOrdersForMaker(maker);

		await this.cancelOrders(activeOrders.orderIds);
		
		console.log(`Cancelled orderIds ${activeOrders.orderIds} for:`, maker);
	}

	async cancelAllBuys(maker: string): Promise<void> {
		const activeOrders = await this.getActiveBuysForMaker(maker);

		await this.cancelOrders(activeOrders.orderIds);
		
		console.log(`Cancelled orderIds ${activeOrders.orderIds} for:`, maker);
	}

	async cancelAllSells(maker: string): Promise<void> {
		const activeOrders = await this.getActiveSellsForMaker(maker);

		await this.cancelOrders(activeOrders.orderIds);
		
		console.log(`Cancelled orderIds ${activeOrders.orderIds} for:`, maker);
	}

	async placeAndExecuteMarketBuy(
		size: number,
		isFillOrKill: boolean
	): Promise<number> {
		const tx = await this.orderbook.placeAndExecuteMarketBuy(
			Math.round(size * this.marketParams.sizePrecision),
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
			Math.round(size * this.marketParams.sizePrecision),
			isFillOrKill
		);
		await tx.wait();
		console.log("Market sell order executed:");
		return tx.value; // Assuming the function returns the remaining size
	}

	async getActiveOrdersForMaker(maker: string): Promise<ActiveOrders> {
        const data = await this.orderbook.getActiveOrdersForAddress(maker);
        let offset = 66;
        const blockNumber = parseInt(data.slice(2, 66), 16);  // Extracting the block number from data
        let orderIds: number[] = [];
        
        while (offset < data.length) {
            const orderId = parseInt(data.slice(offset, offset + 64), 16);
            offset += 64; // Each uint24 is padded to 64 bytes
            orderIds.push(orderId);
        }

        return { blockNumber, orderIds };
    }

	async getOrder(orderId: number): Promise<Order> {
		const order: Order = await this.orderbook.s_orders(orderId);

		return order;
	}

	async isBuyOrder(orderId: number): Promise<boolean> {
		const order: Order = await this.orderbook.s_orders(orderId);

		return order.isBuy;
	}

	async getActiveBuysForMaker(maker: string): Promise<ActiveOrders> {
        const data = await this.orderbook.getActiveBuysForAddress(maker);
        let offset = 66;
        const blockNumber = parseInt(data.slice(2, 66), 16);  // Extracting the block number from data
        let orderIds: number[] = [];
        
        while (offset < data.length) {
            const orderId = parseInt(data.slice(offset, offset + 64), 16);
            offset += 64; // Each uint24 is padded to 64 bytes
            orderIds.push(orderId);
        }

        return { blockNumber, orderIds };
    }

	async getActiveSellsForMaker(maker: string): Promise<ActiveOrders> {
        const data = await this.orderbook.getActiveSellsForAddress(maker);
        let offset = 66;
        const blockNumber = parseInt(data.slice(2, 66), 16);  // Extracting the block number from data
        let orderIds: number[] = [];
        
        while (offset < data.length) {
            const orderId = parseInt(data.slice(offset, offset + 64), 16);
            offset += 64; // Each uint24 is padded to 64 bytes
            orderIds.push(orderId);
        }

        return { blockNumber, orderIds };
    }

	async getL2OrderBook(): Promise<OrderBookData> {
		const data = await this.orderbook.getL2Book();
	
		let offset = 66; // Start reading after the block number
		const blockNumber = parseInt(data.slice(2, 66), 16); // The block number is stored in the first 64 bytes after '0x'
	
		let asks: Record<string, string> = {};
		let bids: Record<string, string> = {};
	
		// Decode asks
		while (offset < data.length) {
			const price = parseInt(data.slice(offset, offset + 64), 16);
			offset += 64; // Skip over padding
			if (price === 0) {
				break; // Stop reading if price is zero
			}
			const size = parseInt(data.slice(offset, offset + 64), 16);
			offset += 64; // Skip over padding
			asks[price.toString()] = size.toString();
		}
	
		// Decode bids
		while (offset < data.length) {
			const price = parseInt(data.slice(offset, offset + 64), 16);
			offset += 64; // Skip over padding
			const size = parseInt(data.slice(offset, offset + 64), 16);
			offset += 64; // Skip over padding
			bids[price.toString()] = size.toString();
		}
	
		return { asks, bids, blockNumber };
	}	
}
