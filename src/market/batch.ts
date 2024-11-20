// ============ External Imports ============
import { ethers, BigNumber, ContractReceipt } from "ethers";

// ============ Internal Imports ============
import { extractErrorMessage, log10BigNumber } from "../utils";
import { MarketParams, BATCH } from "../types";

// ============ Config Imports ============
import orderbookAbi from "../../abi/OrderBook.json";

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
        providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
        orderbookAddress: string,
        marketParams: MarketParams,
        batchUpdate: BATCH
    ): Promise<ContractReceipt> {
        const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, providerOrSigner);

        // Initialize arrays for buy and sell prices and sizes
        const buyPrices: BigNumber[] = [];
        const buySizes: BigNumber[] = [];
        const sellPrices: BigNumber[] = [];
        const sellSizes: BigNumber[] = [];

        // Separate the limit orders into buy and sell arrays
        for (const order of batchUpdate.limitOrders) {
            const pricePrecision = log10BigNumber(marketParams.pricePrecision);
            const sizePrecision = log10BigNumber(marketParams.sizePrecision);
            
            // Round the numbers to their respective precisions before parsing
            const priceStr = Number(order.price).toFixed(pricePrecision);
            const sizeStr = Number(order.size).toFixed(sizePrecision);
            
            const priceBn: BigNumber = ethers.utils.parseUnits(priceStr, pricePrecision);
            const sizeBn: BigNumber = ethers.utils.parseUnits(sizeStr, sizePrecision);

            if (order.isBuy) {
                buyPrices.push(priceBn);
                buySizes.push(sizeBn);
            } else {
                sellPrices.push(priceBn);
                sellSizes.push(sizeBn);
            }
        }

        try {
            const signer = providerOrSigner instanceof ethers.Signer
                ? providerOrSigner
                : providerOrSigner.getSigner();
            const address = await signer.getAddress();

            const data = orderbook.interface.encodeFunctionData("batchUpdate", [
                buyPrices,
                buySizes,
                sellPrices,
                sellSizes,
                batchUpdate.cancelOrders,
                batchUpdate.postOnly
            ]);

            const tx: ethers.providers.TransactionRequest = {
                to: orderbook.address,
                from: address,
                data,
                ...(batchUpdate.txOptions?.nonce !== undefined && { nonce: batchUpdate.txOptions.nonce }),
                ...(batchUpdate.txOptions?.gasLimit && { gasLimit: batchUpdate.txOptions.gasLimit }),
                ...(batchUpdate.txOptions?.gasPrice && { gasPrice: batchUpdate.txOptions.gasPrice }),
                ...(batchUpdate.txOptions?.maxFeePerGas && { maxFeePerGas: batchUpdate.txOptions.maxFeePerGas }),
                ...(batchUpdate.txOptions?.maxPriorityFeePerGas && { maxPriorityFeePerGas: batchUpdate.txOptions.maxPriorityFeePerGas })
            };

            console.time('RPC Calls Time');
            const [gasLimit, baseGasPrice] = await Promise.all([
                !tx.gasLimit ? signer.estimateGas({
                    ...tx,
                    gasPrice: ethers.utils.parseUnits('1', 'gwei'),
                }) : Promise.resolve(tx.gasLimit),
                (!tx.gasPrice && !tx.maxFeePerGas) ? signer.provider!.getGasPrice() : Promise.resolve(undefined)
            ]);
            console.timeEnd('RPC Calls Time');

            if (!tx.gasLimit) {
                tx.gasLimit = gasLimit;
            }

            if (!tx.gasPrice && !tx.maxFeePerGas && baseGasPrice) {
                if (batchUpdate.txOptions?.priorityFee) {
                    const priorityFeeWei = ethers.utils.parseUnits(
                        batchUpdate.txOptions.priorityFee.toString(),
                        'gwei'
                    );
                    tx.gasPrice = baseGasPrice.add(priorityFeeWei);
                } else {
                    tx.gasPrice = baseGasPrice;
                }
            }

            console.time('Transaction Send Time');
            const transaction = await signer.sendTransaction(tx);
            console.timeEnd('Transaction Send Time');

            console.time('Transaction Wait Time');
            const receipt = await transaction.wait();
            console.timeEnd('Transaction Wait Time');

            return receipt;
        } catch (e: any) {
            if (!e.error) {
                throw e;
            }
            throw extractErrorMessage(e);
        }
    }
}
