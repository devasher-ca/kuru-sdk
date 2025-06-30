// ============ External Imports ============
import { ethers, TransactionReceipt } from 'ethers';

// ============ Internal Imports ============
import { extractErrorMessage } from '../utils';
import { TransactionOptions } from '../types';

// ============ Config Imports ============
import orderbookAbi from '../../abi/OrderBook.json';
import buildTransactionRequest from '../utils/txConfig';

export abstract class OrderCanceler {
    /**
     * @dev Constructs a transaction to cancel multiple orders.
     * @param signer - The signer instance to interact with the blockchain.
     * @param orderbookAddress - The address of the order book contract.
     * @param orderIds - An array of order IDs to be cancelled.
     * @param txOptions - Transaction options to be used for the transaction.
     * @returns A promise that resolves to the transaction request object.
     */
    static async constructCancelOrdersTransaction(
        signer: ethers.AbstractSigner,
        orderbookAddress: string,
        orderIds: bigint[],
        txOptions?: TransactionOptions,
    ): Promise<ethers.TransactionRequest> {
        const address = await signer.getAddress();

        const orderbookInterface = new ethers.Interface(orderbookAbi.abi);
        const data = orderbookInterface.encodeFunctionData('batchCancelOrders', [orderIds]);

        return buildTransactionRequest({
            to: orderbookAddress,
            from: address,
            data,
            txOptions,
            signer,
        });
    }

    /**
     * @dev Cancels multiple orders by their IDs.
     * @param providerOrSigner - The ethers.js provider or signer to interact with the blockchain.
     * @param orderbookAddress - The address of the order book contract.
     * @param orderIds - An array of order IDs to be cancelled.
     * @param txOptions - Transaction options to be used for the transaction.
     * @returns A promise that resolves when the transaction is confirmed.
     */
    static async cancelOrders(
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
        orderbookAddress: string,
        orderIds: bigint[],
        txOptions?: TransactionOptions,
    ): Promise<TransactionReceipt> {
        try {
            // const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, providerOrSigner);

            // Get signer from provider if needed
            let signer;
            try {
                signer = (await (providerOrSigner as any).getAddress())
                    ? providerOrSigner
                    : await (providerOrSigner as any).getSigner();
            } catch {
                signer = await (providerOrSigner as any).getSigner();
            }

            const tx = await OrderCanceler.constructCancelOrdersTransaction(
                signer,
                orderbookAddress,
                orderIds,
                txOptions,
            );

            const transaction = await signer.sendTransaction(tx);
            const receipt = await transaction.wait(1);
            if (!receipt) {
                throw new Error('Transaction failed');
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

    static async estimateGas(
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
        orderbookAddress: string,
        orderIds: bigint[],
    ): Promise<bigint> {
        try {
            const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, providerOrSigner);

            const gasEstimate = await orderbook.batchCancelOrders.estimateGas(orderIds);
            return gasEstimate;
        } catch (e: any) {
            console.log({ e });
            if (!e.error) {
                throw e;
            }
            throw extractErrorMessage(e);
        }
    }
}
