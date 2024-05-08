import { ethers } from "ethers";

export interface OrderBookData {
    asks: Record<string, string>;
    bids: Record<string, string>;
    blockNumber: number;
}

export interface ActiveOrders {
    orderIds: number[];
    blockNumber: number;
}

export interface MarketParams {
    pricePrecision: number;
    sizePrecision: number;
    baseAssetAddress: string;
    baseAssetDecimals: number;
    quoteAssetAddress: string;
    quoteAssetDecimals: number;
}