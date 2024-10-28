// ============ External Imports ============
import { ethers, BigNumber, ContractReceipt } from "ethers";

// ============ Internal Imports ============
import { extractErrorMessage } from "../utils";

// ============ Config Imports ============
import orderbookAbi from "../../abi/OrderBook.json";

export abstract class OrderCanceler {
    /**
     * @dev Cancels multiple orders by their IDs.
     * @param providerOrSigner - The ethers.js provider or signer to interact with the blockchain.
     * @param orderbookAddress - The address of the order book contract.
     * @param orderIds - An array of order IDs to be cancelled.
     * @returns A promise that resolves when the transaction is confirmed.
     */
    static async cancelOrders(
        providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
        orderbookAddress: string,
        orderIds: BigNumber[]
    ): Promise<ContractReceipt> {
        try {
            const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, providerOrSigner);

            const tx = await orderbook.batchCancelOrders(orderIds);
            return await tx.wait();
        } catch (e: any) {
            if (!e.error) {
                throw e;
            }
            throw extractErrorMessage(e);
        }
    }

    static async estimateGas(
        providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
        orderbookAddress: string,
        orderIds: BigNumber[]
    ): Promise<BigNumber> {
        try {
            const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, providerOrSigner);

            const gasEstimate = await orderbook.estimateGas.batchCancelOrders(orderIds);
            return gasEstimate;
        } catch (e: any) {
            if (!e.error) {
                throw e;
            }
            throw extractErrorMessage(e);
        }
    }
}
