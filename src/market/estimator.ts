// ============ External Imports ============
import { ethers } from "ethers";

// ============ Internal Imports ============
import { MarketParams } from "../types";
import { getL2OrderBook } from "./orderBook";

/**
 * @dev Estimates the amount of quote tokens that would be received for a market sell order of a given size.
 * @param provider - The ethers.js provider to interact with the blockchain.
 * @param orderbookAddress - The address of the order book contract.
 * @param marketParams - The market parameters including price and size precision.
 * @param size - The size of the base asset to sell.
 * @returns A promise that resolves to the amount of quote tokens received.
 */
export async function estimateMarketSell(
    provider: ethers.providers.JsonRpcProvider,
    orderbookAddress: string,
    marketParams: MarketParams,
    size: number,
): Promise<number> {
    const l2OrderBook = await getL2OrderBook(
        provider,
        orderbookAddress,
        marketParams
    );

    let remainingSize = size;
    let receivedAmount = 0;
    const orders = l2OrderBook.bids;

    for (const [price, orderSize] of orders) {
        const orderSizeFloat = orderSize;
        const priceFloat = price;

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
 * @dev Estimates the amount of base tokens required to receive a given amount of quote tokens from a market sell order.
 * @param provider - The ethers.js provider to interact with the blockchain.
 * @param orderbookAddress - The address of the order book contract.
 * @param marketParams - The market parameters including price and size precision.
 * @param quoteAmount - The amount of quote tokens desired.
 * @returns A promise that resolves to the amount of base tokens required.
 */
export async function estimateRequiredBaseForSell(
    provider: ethers.providers.JsonRpcProvider,
    orderbookAddress: string,
    marketParams: MarketParams,
    quoteAmount: number
): Promise<number> {
    const l2OrderBook = await getL2OrderBook(
        provider,
        orderbookAddress,
        marketParams
    );

    let remainingQuote = quoteAmount;
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
 * @param provider - The ethers.js provider to interact with the blockchain.
 * @param orderbookAddress - The address of the order book contract.
 * @param marketParams - The market parameters including price and size precision.
 * @param quoteAmount - The amount of quote tokens to spend.
 * @returns A promise that resolves to the amount of base tokens received.
 */
export async function estimateMarketBuy(
    provider: ethers.providers.JsonRpcProvider,
    orderbookAddress: string,
    marketParams: MarketParams,
    quoteAmount: number
): Promise<number> {
    const l2OrderBook = await getL2OrderBook(
        provider,
        orderbookAddress,
        marketParams
    );

    let remainingQuote = quoteAmount;
    let baseTokensReceived = 0;

    for (const [price, orderSize] of l2OrderBook.asks.reverse()) {
        const orderSizeFloat = orderSize;
        const priceFloat = price;

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
 * @dev Estimates the amount of quote tokens required to buy a given amount of base tokens in a market buy order.
 * @param provider - The ethers.js provider to interact with the blockchain.
 * @param orderbookAddress - The address of the order book contract.
 * @param marketParams - The market parameters including price and size precision.
 * @param baseSize - The size of the base tokens to buy.
 * @returns A promise that resolves to the amount of quote tokens required.
 */
export async function estimateRequiredQuoteForBuy(
    provider: ethers.providers.JsonRpcProvider,
    orderbookAddress: string,
    marketParams: MarketParams,
    baseTokenAmount: number
): Promise<number> {
    const l2OrderBook = await getL2OrderBook(
        provider,
        orderbookAddress,
        marketParams
    );

    let remainingBase = baseTokenAmount;
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
