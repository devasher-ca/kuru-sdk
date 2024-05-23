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

export interface Order {
    ownerAddress: string,
    size: number,
    prev: number,
    next: number,
    price: number
    isBuy: boolean
}

export interface MarketParams {
    pricePrecision: number;
    sizePrecision: number;
    baseAssetAddress: string;
    baseAssetDecimals: number;
    quoteAssetAddress: string;
    quoteAssetDecimals: number;
}

export interface OrderEvent {
    orderId: number,
    ownerAddress: string,
    size: number,
    price: number,
    isBuy: boolean
}

export interface TradeEvent {
    orderId: number,
    isBuy: boolean,
    price: number,
    updatedSize: number,
    takerAddress: string,
    filledSize: number
}
