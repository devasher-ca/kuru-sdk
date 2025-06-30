import { BigNumberish } from 'ethers';

export interface TransactionOptions {
    nonce?: number;
    gasPrice?: BigNumberish;
    gasLimit?: BigNumberish;
    maxFeePerGas?: BigNumberish;
    maxPriorityFeePerGas?: BigNumberish;
    priorityFee?: number;
}

export interface LIMIT {
    price: string;
    size: string;
    isBuy: boolean;
    postOnly: boolean;
    txOptions?: TransactionOptions;
}

export interface MARKET {
    approveTokens: boolean;
    isBuy: boolean;
    size: string;
    minAmountOut: string;
    isMargin: boolean;
    fillOrKill: boolean;
    txOptions?: TransactionOptions;
}

export interface BATCH {
    limitOrders: LIMIT[];
    cancelOrders: BigNumberish[];
    postOnly: boolean;
    txOptions?: TransactionOptions;
}
