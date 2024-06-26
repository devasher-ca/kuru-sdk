// ============ External Imports ============
import { ethers, BigNumber } from "ethers";

// ============ Internal Imports ============
import { extractErrorMessage } from "../utils";
import { getActiveOrdersForMaker, getActiveBuysForMaker, getActiveSellsForMaker } from "./orders";
import { ActiveOrders } from "../types";

// ============ Config Imports ============
import orderbookAbi from "../../abi/OrderBook.json";

/**
 * @dev Cancels multiple orders by their IDs.
 * @param providerOrSigner - The ethers.js provider or signer to interact with the blockchain.
 * @param orderbookAddress - The address of the order book contract.
 * @param orderIds - An array of order IDs to be cancelled.
 * @returns A promise that resolves when the transaction is confirmed.
 */

export async function cancelOrders(
    providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
    orderbookAddress: string,
    orderIds: BigNumber[]
): Promise<void> {
    try {
        const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, providerOrSigner);

        const tx = await orderbook.batchCancelOrders(orderIds);
        await tx.wait();
    } catch (e: any) {
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e.error.body);
    }
}

/**
 * @dev Cancels all orders for a specific maker.
 * @param providerOrSigner - The ethers.js provider or signer to interact with the blockchain.
 * @param orderbookAddress - The address of the order book contract.
 * @param maker - The address of the maker whose orders should be cancelled.
 * @returns A promise that resolves to a list of orderIds of canceled orders.
 */
export async function cancelAllOrders(
    providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
    orderbookAddress: string,
    maker: string
): Promise<ActiveOrders> {
    try {
        const activeOrders = await getActiveOrdersForMaker(
            providerOrSigner,
            orderbookAddress,
            maker
        );

        await cancelOrders(
            providerOrSigner,
            orderbookAddress,
            activeOrders.orderIds
        );

        return activeOrders;
    } catch (e: any) {
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e.error.body);
    }
}

/**
 * @dev Cancels all buy orders for a specific maker.
 * @param providerOrSigner - The ethers.js provider or signer to interact with the blockchain.
 * @param orderbookAddress - The address of the order book contract.
 * @param maker - The address of the maker whose buy orders should be cancelled.
 * @returns A promise that resolves to a list of orderIds of canceled orders.
 */
export async function cancelAllBuys(
    providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
    orderbookAddress: string,
    maker: string
): Promise<ActiveOrders> {
    try {
        const activeOrders = await getActiveBuysForMaker(
            providerOrSigner,
            orderbookAddress,
            maker
        );

        await cancelOrders(
            providerOrSigner,
            orderbookAddress,
            activeOrders.orderIds
        );
        
        return activeOrders;
    } catch (e: any) {
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e.error.body);
    }
}

/**
 * @dev Cancels all sell orders for a specific maker.
 * @param providerOrSigner - The ethers.js provider or signer to interact with the blockchain.
 * @param orderbookAddress - The address of the order book contract.
 * @param maker - The address of the maker whose sell orders should be cancelled.
 * @returns A promise that resolves to a list of orderIds of canceled orders.
 */
export async function cancelAllSells(
    providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
    orderbookAddress: string,
    maker: string
): Promise<ActiveOrders> {
    try {
        const activeOrders = await getActiveSellsForMaker(
            providerOrSigner,
            orderbookAddress,
            maker
        );

        await cancelOrders(
            providerOrSigner,
            orderbookAddress,
            activeOrders.orderIds
        );
        
        return activeOrders; 
    } catch (e: any) {
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e.error.body);
    }
}
