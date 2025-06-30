// ============ External Imports ============
import { ethers, parseUnits, TransactionReceipt } from 'ethers';

// ============ Internal Imports ============
import { extractErrorMessage, log10BigNumber } from '../utils';
import { MarketParams, BATCH } from '../types';

// ============ Config Imports ============
import orderbookAbi from '../../abi/OrderBook.json';
import buildTransactionRequest from '../utils/txConfig';

export abstract class OrderBatcher {
    /**
     * @dev Batch updates the order book by placing multiple buy and sell limit orders and canceling existing orders.
     * @param providerOrSigner - The ethers.js provider or signer to interact with the blockchain.
     * @param orderbookAddress - The address of the order book contract.
     * @param marketParams - The market parameters including price and size precision.
     * @param batchUpdate - The batch update object containing limit orders and order IDs to cancel.
     * @returns A promise that resolves when the transaction is confirmed.
     */
    static async batchUpdate(
        providerOrSigner: ethers.JsonRpcProvider | ethers.Signer,
        orderbookAddress: string,
        marketParams: MarketParams,
        batchUpdate: BATCH,
    ): Promise<TransactionReceipt> {
        const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, providerOrSigner);

        // Initialize arrays for buy and sell prices and sizes
        const buyPrices: bigint[] = [];
        const buySizes: bigint[] = [];
        const sellPrices: bigint[] = [];
        const sellSizes: bigint[] = [];

        // Separate the limit orders into buy and sell arrays
        for (const order of batchUpdate.limitOrders) {
            const pricePrecision = log10BigNumber(marketParams.pricePrecision);
            const sizePrecision = log10BigNumber(marketParams.sizePrecision);

            // Round the numbers to their respective precisions before parsing
            const priceStr = Number(order.price).toFixed(pricePrecision);
            const sizeStr = Number(order.size).toFixed(sizePrecision);

            const priceBn: bigint = parseUnits(priceStr, pricePrecision);
            const sizeBn: bigint = parseUnits(sizeStr, sizePrecision);

            if (order.isBuy) {
                buyPrices.push(priceBn);
                buySizes.push(sizeBn);
            } else {
                sellPrices.push(priceBn);
                sellSizes.push(sizeBn);
            }
        }

        try {
            const signer = providerOrSigner as ethers.AbstractSigner;
            const address = await signer.getAddress();

            const data = orderbook.interface.encodeFunctionData('batchUpdate', [
                buyPrices,
                buySizes,
                sellPrices,
                sellSizes,
                batchUpdate.cancelOrders,
                batchUpdate.postOnly,
            ]);

            const tx = await buildTransactionRequest({
                to: orderbookAddress,
                from: address,
                data,
                txOptions: batchUpdate.txOptions,
                signer,
            });

            const transaction = await signer.sendTransaction(tx);
            const receipt = await transaction.wait();

            if (!receipt) {
                throw new Error('Transaction failed');
            }
            return receipt;
        } catch (e: any) {
            if (!e.error) {
                throw e;
            }
            throw extractErrorMessage(e);
        }
    }
}
