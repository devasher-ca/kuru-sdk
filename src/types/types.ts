import { BigNumberish } from 'ethers';

export interface OrderBookData {
    asks: number[][];
    bids: number[][];
    blockNumber: number;
    vaultParams: VaultParams;
    manualOrders: {
        bids: number[][];
        asks: number[][];
    };
}

export interface WssOrderEvent {
    orderId: number;
    owner: string;
    size: BigNumberish;
    price: BigNumberish;
    isBuy: boolean;
    blockNumber: BigNumberish;
    transactionHash: string;
    triggerTime: number;
    marketAddress: string;
}

export interface CanceledOrder {
    orderid: number;
    owner: string;
    size: string;
    price: string;
    isbuy: boolean;
    remainingsize: string;
    iscanceled: boolean;
    blocknumber: string;
    transactionhash: string;
    triggertime: string;
}

export interface WssCanceledOrderEvent {
    orderIds: number[];
    makerAddress: string;
    canceledOrdersData: CanceledOrder[];
}

export interface WssTradeEvent {
    orderId: number;
    makerAddress: string;
    isBuy: boolean;
    price: string;
    updatedSize: string;
    takerAddress: string;
    filledSize: string;
    blockNumber: string;
    transactionHash: string;
    triggerTime: number;
}

export interface ActiveOrders {
    orderIds: BigNumberish[];
    blockNumber: number;
}

export interface Order {
    ownerAddress: string;
    size: number;
    prev: number;
    next: number;
    price: number;
    isBuy: boolean;
}

export interface MarketParams {
    pricePrecision: BigNumberish;
    sizePrecision: BigNumberish;
    baseAssetAddress: string;
    baseAssetDecimals: BigNumberish;
    quoteAssetAddress: string;
    quoteAssetDecimals: BigNumberish;
    tickSize: BigNumberish;
    minSize: BigNumberish;
    maxSize: BigNumberish;
    takerFeeBps: BigNumberish;
    makerFeeBps: BigNumberish;
}

export interface VaultParams {
    kuruAmmVault: string;
    vaultBestBid: BigNumberish;
    bidPartiallyFilledSize: BigNumberish;
    vaultBestAsk: BigNumberish;
    askPartiallyFilledSize: BigNumberish;
    vaultBidOrderSize: BigNumberish;
    vaultAskOrderSize: BigNumberish;
    spread: BigNumberish;
}

export interface OrderEvent {
    orderId: BigNumberish;
    ownerAddress: string;
    size: BigNumberish;
    price: BigNumberish;
    isBuy: boolean;
}

export interface TradeEvent {
    orderId: BigNumberish;
    isBuy: boolean;
    price: BigNumberish;
    updatedSize: BigNumberish;
    takerAddress: string;
    filledSize: BigNumberish;
}

export interface TokenInfo {
    name: string;
    symbol: string;
    balance: BigNumberish;
    decimals: number;
    totalSupply: BigNumberish;
}
