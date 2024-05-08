import { ethers } from "ethers";

export interface OrderBookData {
    asks: Record<string, string>;
    bids: Record<string, string>;
    blockNumber: number;
}

export interface MarketParams {
    pricePrecision: bigint;
    sizePrecision: bigint;
    baseAssetAddress: string;
    baseAssetDecimals: number;
    quoteAssetAddress: string;
    quoteAssetDecimals: number;
}