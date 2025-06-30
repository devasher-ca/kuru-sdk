// ============ External Imports ============
import { ethers, parseUnits } from 'ethers';

// ============ Internal Imports ============
import { clipToDecimals, extractErrorMessage, log10BigNumber } from '../utils';
import { MarketParams, LIMIT, TransactionOptions } from '../types';

// ============ Config Imports ============
import orderbookAbi from '../../abi/OrderBook.json';
import buildTransactionRequest from '../utils/txConfig';

export abstract class GTC {
    /**
     * @dev Places a limit order (buy or sell) on the order book.
     * @param providerOrSigner - The ethers.js provider or signer to interact with the blockchain.
     * @param orderbookAddress - The address of the order book contract.
     * @param marketParams - The market parameters including price and size precision.
     * @param order - The limit order object containing price, size, isBuy, and postOnly properties.
     * @param txOptions - The transaction options for the order.
     * @returns A promise that resolves to a boolean indicating success or failure.
     */
    static async placeLimit(
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
        orderbookAddress: string,
        marketParams: MarketParams,
        order: LIMIT,
    ): Promise<ethers.TransactionReceipt> {
        const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, providerOrSigner);

        const clippedPrice = clipToDecimals(order.price, log10BigNumber(marketParams.pricePrecision));
        const clippedSize = clipToDecimals(order.size, log10BigNumber(marketParams.sizePrecision));

        const priceBn: bigint = parseUnits(clippedPrice, log10BigNumber(marketParams.pricePrecision));
        const sizeBn: bigint = parseUnits(clippedSize, log10BigNumber(marketParams.sizePrecision));

        return order.isBuy
            ? GTC.addBuyOrder(orderbook, priceBn, sizeBn, order.postOnly, order.txOptions, providerOrSigner)
            : GTC.addSellOrder(orderbook, priceBn, sizeBn, order.postOnly, order.txOptions, providerOrSigner);
    }

    static async estimateGas(
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
        orderbookAddress: string,
        marketParams: MarketParams,
        order: LIMIT,
    ): Promise<bigint> {
        const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, providerOrSigner);

        const clippedPrice = clipToDecimals(order.price, log10BigNumber(marketParams.pricePrecision));
        const clippedSize = clipToDecimals(order.size, log10BigNumber(marketParams.sizePrecision));

        const priceBn: bigint = parseUnits(clippedPrice, log10BigNumber(marketParams.pricePrecision));
        const sizeBn: bigint = parseUnits(clippedSize, log10BigNumber(marketParams.sizePrecision));

        return order.isBuy
            ? estimateGasBuy(orderbook, priceBn, sizeBn, order.postOnly)
            : estimateGasSell(orderbook, priceBn, sizeBn, order.postOnly);
    }

    /**
     * @dev Constructs a transaction for a buy limit order.
     * @param signer - The signer instance.
     * @param orderbookAddress - The address of the order book contract.
     * @param price - The price of the order.
     * @param size - The size of the order.
     * @param postOnly - Whether the order is post-only.
     * @param txOptions - Transaction options.
     * @returns A promise that resolves to the transaction request object.
     */
    static async constructBuyOrderTransaction(
        signer: ethers.AbstractSigner,
        orderbookAddress: string,
        price: bigint,
        size: bigint,
        postOnly: boolean,
        txOptions?: TransactionOptions,
    ): Promise<ethers.TransactionRequest> {
        const address = await signer.getAddress();

        const orderbookInterface = new ethers.Interface(orderbookAbi.abi);
        const data = orderbookInterface.encodeFunctionData('addBuyOrder', [price, size, postOnly]);

        return buildTransactionRequest({
            to: orderbookAddress,
            from: address,
            data,
            txOptions,
            signer,
        });
    }

    /**
     * @dev Constructs a transaction for a sell limit order.
     * @param signer - The signer instance.
     * @param orderbookAddress - The address of the order book contract.
     * @param price - The price of the order.
     * @param size - The size of the order.
     * @param postOnly - Whether the order is post-only.
     * @param txOptions - Transaction options.
     * @returns A promise that resolves to the transaction request object.
     */
    static async constructSellOrderTransaction(
        signer: ethers.AbstractSigner,
        orderbookAddress: string,
        price: bigint,
        size: bigint,
        postOnly: boolean,
        txOptions?: TransactionOptions,
    ): Promise<ethers.TransactionRequest> {
        const address = await signer.getAddress();

        const orderbookInterface = new ethers.Interface(orderbookAbi.abi);
        const data = orderbookInterface.encodeFunctionData('addSellOrder', [price, size, postOnly]);

        return buildTransactionRequest({
            to: orderbookAddress,
            from: address,
            data,
            txOptions,
            signer,
        });
    }

    /**
     * @dev Places a buy limit order on the order book.
     */
    static async addBuyOrder(
        orderbook: ethers.Contract,
        price: bigint,
        size: bigint,
        postOnly: boolean,
        txOptions?: TransactionOptions,
        providerOrSigner?: ethers.JsonRpcProvider | ethers.AbstractSigner,
    ): Promise<ethers.TransactionReceipt> {
        try {
            // Extract signer from contract or use provider/signer directly
            const signer = providerOrSigner as ethers.AbstractSigner;

            const tx = await GTC.constructBuyOrderTransaction(
                signer,
                await orderbook.getAddress(),
                price,
                size,
                postOnly,
                txOptions,
            );

            const transaction = await signer.sendTransaction(tx);
            const receipt = await transaction.wait(1);

            if (!receipt) {
                throw new Error('Transaction receipt is null');
            }

            return receipt;
        } catch (e: any) {
            console.log({ e });
            if (!e.error) {
                throw e;
            }
            throw extractErrorMessage(e);
        }
    }

    /**
     * @dev Places a sell limit order on the order book.
     */
    static async addSellOrder(
        orderbook: ethers.Contract,
        price: bigint,
        size: bigint,
        postOnly: boolean,
        txOptions?: TransactionOptions,
        providerOrSigner?: ethers.JsonRpcProvider | ethers.AbstractSigner,
    ): Promise<ethers.TransactionReceipt> {
        try {
            // Extract signer from contract or use provider/signer directly
            const signer = providerOrSigner as ethers.AbstractSigner;

            const tx = await GTC.constructSellOrderTransaction(
                signer,
                await orderbook.getAddress(),
                price,
                size,
                postOnly,
                txOptions,
            );

            const transaction = await signer.sendTransaction(tx);
            const receipt = await transaction.wait(1);

            if (!receipt) {
                throw new Error('Transaction receipt is null');
            }

            return receipt;
        } catch (e: any) {
            console.log({ e });
            if (!e.error) {
                throw e;
            }
            throw extractErrorMessage(e);
        }
    }
}

// ======================== INTERNAL HELPER FUNCTIONS ========================

async function estimateGasBuy(
    orderbook: ethers.Contract,
    price: bigint,
    size: bigint,
    postOnly: boolean,
): Promise<bigint> {
    try {
        const gasEstimate = await orderbook.addBuyOrder.estimateGas(price, size, postOnly);
        return gasEstimate;
    } catch (e: any) {
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e);
    }
}

async function estimateGasSell(
    orderbook: ethers.Contract,
    price: bigint,
    size: bigint,
    postOnly: boolean,
): Promise<bigint> {
    try {
        const gasEstimate = await orderbook.addSellOrder.estimateGas(price, size, postOnly);
        return gasEstimate;
    } catch (e: any) {
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e);
    }
}
