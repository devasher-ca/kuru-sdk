// ============ External Imports ============
import { ethers, parseUnits, formatUnits, ZeroAddress } from 'ethers';

// ============ Internal Imports ============
import { MarketParams } from '../types';
import { OrderBook } from './orderBook';
import { log10BigNumber } from '../utils';

// ============ Config Imports ============
import { extractErrorMessage } from '../utils';
import orderbookAbi from '../../abi/OrderBook.json';

export abstract class CostEstimator {
    /**
     * @dev Estimates the amount of quote tokens that would be received for a market sell order of a given size.
     * @param providerOrSigner - The ethers.js provider to interact with the blockchain.
     * @param orderbookAddress - The address of the order book contract.
     * @param marketParams - The market parameters including price and size precision.
     * @param size - The size of the base asset to sell.
     * @returns A promise that resolves to the amount of quote tokens received.
     */
    static async estimateMarketSell(
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
        orderbookAddress: string,
        marketParams: MarketParams,
        size: number,
    ): Promise<{ output: number; estimatedGas: bigint }> {
        const sizeInPrecision = parseUnits(
            size.toFixed(log10BigNumber(marketParams.sizePrecision)),
            log10BigNumber(marketParams.sizePrecision),
        );

        try {
            const { output, estimatedGas } = await this.returnMarketSellEstimate(
                providerOrSigner,
                orderbookAddress,
                sizeInPrecision,
            );

            return {
                output: Number(formatUnits(output, marketParams.quoteAssetDecimals)),
                estimatedGas,
            };
        } catch (e: any) {
            if (!e.error) {
                throw e;
            }
            throw extractErrorMessage(e);
        }
    }

    static async returnMarketSellEstimate(
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
        orderbookAddress: string,
        size: bigint,
    ): Promise<{ output: bigint; estimatedGas: bigint }> {
        const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, providerOrSigner);

        const [estimate, estimatedGas] = await Promise.all([
            orderbook.placeAndExecuteMarketSell.staticCall(size, 0, false, false, {
                from: ZeroAddress,
            }),
            orderbook.placeAndExecuteMarketSell.estimateGas(size, 0, false, false, {
                from: ZeroAddress,
            }),
        ]);

        return { output: estimate, estimatedGas };
    }

    /**
     * @dev Estimates the amount of base tokens required to receive a given amount of quote tokens from a market sell order.
     * @param providerOrSigner - The ethers.js provider to interact with the blockchain.
     * @param orderbookAddress - The address of the order book contract.
     * @param marketParams - The market parameters including price and size precision.
     * @param quoteAmount - The amount of quote tokens desired.
     * @returns A promise that resolves to the amount of base tokens required.
     */
    static async estimateRequiredBaseForSell(
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
        orderbookAddress: string,
        marketParams: MarketParams,
        quoteAmount: number,
        l2Book: any,
        contractVaultParams: any,
    ): Promise<number> {
        const takerFeeBps = Number(marketParams.takerFeeBps.toString()) / 10000;
        const grossQuoteAmount = quoteAmount / (1 - takerFeeBps);

        const l2OrderBook = await OrderBook.getL2OrderBook(
            providerOrSigner,
            orderbookAddress,
            marketParams,
            l2Book,
            contractVaultParams,
        );

        let remainingQuote = grossQuoteAmount;
        let requiredBaseTokens = 0;

        for (const [price, orderSize] of l2OrderBook.bids) {
            const orderSizeFloat = orderSize;
            const priceFloat = price;

            if (remainingQuote <= 0) {
                break;
            }

            const orderValueInQuote = orderSizeFloat * priceFloat;

            if (remainingQuote >= orderValueInQuote) {
                requiredBaseTokens += orderSizeFloat;
                remainingQuote -= orderValueInQuote;
            } else {
                requiredBaseTokens += remainingQuote / priceFloat;
                remainingQuote = 0;
            }
        }

        return requiredBaseTokens;
    }

    /**
     * @dev Estimates the amount of base tokens that would be received for a market buy order given a certain amount of quote tokens.
     * @param providerOrSigner - The ethers.js provider to interact with the blockchain.
     * @param orderbookAddress - The address of the order book contract.
     * @param marketParams - The market parameters including price and size precision.
     * @param quoteAmount - The amount of quote tokens to spend.
     * @returns A promise that resolves to the amount of base tokens received.
     */
    static async estimateMarketBuy(
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
        orderbookAddress: string,
        marketParams: MarketParams,
        quoteAmount: number,
    ): Promise<{ output: number; estimatedGas: bigint }> {
        const sizeInPrecision = parseUnits(
            quoteAmount.toFixed(log10BigNumber(marketParams.pricePrecision)),
            log10BigNumber(marketParams.pricePrecision),
        );

        try {
            const { output, estimatedGas } = await this.returnMarketBuyEstimate(
                providerOrSigner,
                orderbookAddress,
                sizeInPrecision,
            );

            return {
                output: parseFloat(formatUnits(output, marketParams.baseAssetDecimals)),
                estimatedGas,
            };
        } catch (e: any) {
            if (!e.error) {
                throw e;
            }
            throw extractErrorMessage(e);
        }
    }

    static async returnMarketBuyEstimate(
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
        orderbookAddress: string,
        size: bigint,
    ): Promise<{ output: bigint; estimatedGas: bigint }> {
        const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, providerOrSigner);

        const [estimate, estimatedGas] = await Promise.all([
            orderbook.placeAndExecuteMarketBuy.staticCall(size, 0, false, false, {
                from: ZeroAddress,
            }),
            orderbook.placeAndExecuteMarketBuy.estimateGas(size, 0, false, false, {
                from: ZeroAddress,
            }),
        ]);

        return { output: estimate, estimatedGas };
    }

    /**
     * @dev Estimates the amount of quote tokens required to buy a given amount of base tokens in a market buy order.
     * @param providerOrSigner - The ethers.js provider to interact with the blockchain.
     * @param orderbookAddress - The address of the order book contract.
     * @param marketParams - The market parameters including price and size precision.
     * @param baseSize - The size of the base tokens to buy.
     * @returns A promise that resolves to the amount of quote tokens required.
     */
    static async estimateRequiredQuoteForBuy(
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
        orderbookAddress: string,
        marketParams: MarketParams,
        baseTokenAmount: number,
        l2Book: any,
        contractVaultParams: any,
    ): Promise<number> {
        const takerFeeBps = Number(marketParams.takerFeeBps.toString()) / 10000;
        const grossBaseTokenAmount = baseTokenAmount / (1 - takerFeeBps);

        const l2OrderBook = await OrderBook.getL2OrderBook(
            providerOrSigner,
            orderbookAddress,
            marketParams,
            l2Book,
            contractVaultParams,
        );

        let remainingBase = grossBaseTokenAmount;
        let requiredQuoteTokens = 0;

        for (const [price, orderSize] of l2OrderBook.asks.reverse()) {
            const orderSizeFloat = orderSize;
            const priceFloat = price;

            if (remainingBase <= 0) {
                break;
            }

            if (remainingBase >= orderSizeFloat) {
                requiredQuoteTokens += orderSizeFloat * priceFloat;
                remainingBase -= orderSizeFloat;
            } else {
                requiredQuoteTokens += remainingBase * priceFloat;
                remainingBase = 0;
            }
        }

        return requiredQuoteTokens;
    }
}
