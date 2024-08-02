import { BigNumber } from "ethers";

export interface OrderBookData {
    asks: number[][];
    bids: number[][];
    blockNumber: number;
}

export interface ActiveOrders {
    orderIds: BigNumber[];
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
    pricePrecision: BigNumber;
    sizePrecision: BigNumber;
    baseAssetAddress: string;
    baseAssetDecimals: BigNumber;
    quoteAssetAddress: string;
    quoteAssetDecimals: BigNumber;
    tickSize: BigNumber;
    minSize: BigNumber;
    maxSize: BigNumber;
    takerFeeBps: BigNumber;
    makerFeeBps: BigNumber;
}

export interface VaultParams {
    kuruAmmVault: string;
    vaultBestBid: BigNumber;
    bidPartiallyFilledSize: BigNumber;
    vaultBestAsk: BigNumber;
    askPartiallyFilledSize: BigNumber;
    vaultBidOrderSize: BigNumber;
    vaultAskOrderSize: BigNumber;
}

export interface OrderEvent {
    orderId: BigNumber,
    ownerAddress: string,
    size: BigNumber,
    price: BigNumber,
    isBuy: boolean
}

export interface TradeEvent {
    orderId: BigNumber,
    isBuy: boolean,
    price: BigNumber,
    updatedSize: BigNumber,
    takerAddress: string,
    filledSize: BigNumber
}
