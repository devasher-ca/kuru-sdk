import { ethers } from "ethers";
import { Contract } from "ethers";

import {OrderBookData, MarketParams} from "../types/types";
import orderbookAbi from "../../abi/CranklessOrderBook.json";
import erc20Abi from "../../abi/IERC20.json";

class OrderbookClient {
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
            pricePrecision: marketParamsData[0],
            sizePrecision: marketParamsData[1],
            baseAssetAddress: marketParamsData[2],
            baseAssetDecimals: marketParamsData[3],
            quoteAssetAddress: marketParamsData[4],
            quoteAssetDecimals: marketParamsData[5],
        };

        const baseToken = new ethers.Contract(marketParams.baseAssetAddress, erc20Abi.abi, wallet);
        const quoteToken = new ethers.Contract(marketParams.quoteAssetAddress, erc20Abi.abi, wallet);

        return new OrderbookClient(provider, wallet, orderbook, baseToken, quoteToken, marketParams);
    }

    async approveBase(size: bigint): Promise<void> {
        const tx = await this.baseToken.approve(await this.orderbook.getAddress(), size * BigInt(10^this.marketParams.baseAssetDecimals));
		await tx.wait();
		console.log("Base tokens approved:");
    }

    async approveQuote(size: bigint): Promise<void> {
        const tx = await this.quoteToken.approve(await this.orderbook.getAddress(),  size * BigInt(10^this.marketParams.quoteAssetDecimals));
		await tx.wait();
		console.log("Quote tokens approved");
    }

    /**
	 * @dev Estimates the gas required to place a limit order.
	 * @param {bigint} size - The size of the order.
	 * @returns {Promise<bigint>} - A promise that resolves to the estimated gas required for the transaction.
	 */
	async estimateGasForApproval(
		size: bigint,
        isBase: boolean
	): Promise<bigint> {
		// Encode the function call
		const encodeData = isBase ? size * BigInt(10^this.marketParams.baseAssetDecimals) : size * BigInt(10^this.marketParams.quoteAssetDecimals);
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

	async placeLimit(price: bigint, size: bigint, isBuy: boolean): Promise<void> {
		return isBuy
			? this.addBuyOrder(price, size)
			: this.addSellOrder(price, size);
	}

	/**
	 * @dev Estimates the gas required to place a limit order.
	 * @param {bigint} price - The price at which the limit order is to be placed.
	 * @param {bigint} size - The size of the order.
	 * @param {boolean} isBuy - A boolean indicating whether it's a buy order (true) or sell order (false).
	 * @returns {Promise<bigint>} - A promise that resolves to the estimated gas required for the transaction.
	 */
	async estimateGasForLimitOrder(
		price: bigint,
		size: bigint,
		isBuy: boolean
	): Promise<bigint> {
		// Make sure the function name and arguments match the contract
		const functionName = isBuy ? "addBuyOrder" : "addSellOrder";
		const args = [price * this.marketParams.pricePrecision, size * this.marketParams.sizePrecision];

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
		size: bigint,
		isBuy: boolean
	): Promise<bigint> {
		return isBuy
			? this.placeAndExecuteMarketBuy(size, true)
			: this.placeAndExecuteMarketSell(size, true);
	}

	async placeMarket(
		size: bigint,
		isBuy: boolean
	): Promise<bigint> {
		return isBuy
			? this.placeAndExecuteMarketBuy(size, false)
			: this.placeAndExecuteMarketSell(size, false);
	}

	async addBuyOrder(price: bigint, size: bigint): Promise<void> {
		const tx = await this.orderbook.addBuyOrder(price * this.marketParams.pricePrecision, size * this.marketParams.sizePrecision);
		await tx.wait();
		console.log("Buy order added:");
	}

	async addSellOrder(price: bigint, size: bigint): Promise<void> {
		const tx = await this.orderbook.addSellOrder(price * this.marketParams.pricePrecision, size * this.marketParams.sizePrecision);
		await tx.wait();
		console.log("Sell order added:");
	}

	async placeLimits(
		prices: bigint[],
		sizes: bigint[],
		isBuy: boolean
	): Promise<void> {
		return isBuy
			? this.placeMultipleBuyOrders(prices, sizes)
			: this.placeMultipleSellOrders(prices, sizes);
	}

	async placeMultipleBuyOrders(
		prices: bigint[],
		sizes: bigint[]
	): Promise<void> {
		const tx = await this.orderbook.placeMultipleBuyOrders(
			prices.map(price => price * this.marketParams.pricePrecision),
			sizes.map(size => size * this.marketParams.sizePrecision)
		);
		await tx.wait();
		console.log("Multiple buy orders placed:");
	}

	async placeMultipleSellOrders(
		prices: bigint[],
		sizes: bigint[]
	): Promise<void> {
		const tx = await this.orderbook.placeMultipleSellOrders(
			prices.map(price => price * this.marketParams.pricePrecision),
			sizes.map(size => size * this.marketParams.sizePrecision)
		);
		await tx.wait();
		console.log("Multiple sell orders placed:");
	}

	async cancelOrders(orderIds: number[]): Promise<void> {
		const tx = await this.orderbook.batchCancelOrders(orderIds);
		await tx.wait();
		console.log("Batch orders cancelled:", orderIds);
	}

	async placeAndExecuteMarketBuy(
		size: bigint,
		isFillOrKill: boolean
	): Promise<bigint> {
		const tx = await this.orderbook.placeAndExecuteMarketBuy(
			size * this.marketParams.sizePrecision,
			isFillOrKill
		);
		await tx.wait();
		console.log("Market buy order executed:");
		return tx.value; // Assuming the function returns the remaining size
	}

	async placeAndExecuteMarketSell(
		size: bigint,
		isFillOrKill: boolean
	): Promise<bigint> {
		const tx = await this.orderbook.placeAndExecuteMarketSell(
			this.marketParams.sizePrecision,
			isFillOrKill
		);
		await tx.wait();
		console.log("Market sell order executed:");
		return tx.value; // Assuming the function returns the remaining size
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

export default OrderbookClient;
