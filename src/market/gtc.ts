// ============ External Imports ============
import { ethers, BigNumber } from "ethers";

// ============ Internal Imports ============
import { extractErrorMessage, log10BigNumber } from "../utils";
import { MarketParams, LIMIT } from "../types";

// ============ Config Imports ============
import orderbookAbi from "../../abi/OrderBook.json";

export abstract class GTC {
    /**
     * @dev Places a limit order (buy or sell) on the order book.
     * @param providerOrSigner - The ethers.js provider or signer to interact with the blockchain.
     * @param orderbookAddress - The address of the order book contract.
     * @param marketParams - The market parameters including price and size precision.
     * @param order - The limit order object containing price, size, isBuy, and postOnly properties.
     * @returns A promise that resolves to a boolean indicating success or failure.
     */
    static async placeLimit(
        providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
        orderbookAddress: string,
        marketParams: MarketParams,
        order: LIMIT
    ): Promise<boolean> {
        const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, providerOrSigner);

        const priceBn: BigNumber = ethers.utils.parseUnits(order.price.toString(), log10BigNumber(marketParams.pricePrecision));
        const sizeBn: BigNumber = ethers.utils.parseUnits(order.size.toString(), log10BigNumber(marketParams.sizePrecision));

        return order.isBuy
            ? addBuyOrder(orderbook, priceBn, sizeBn, order.postOnly)
            : addSellOrder(orderbook, priceBn, sizeBn, order.postOnly);
    }
}

// ======================== INTERNAL HELPER FUNCTIONS ========================

/**
 * @dev Adds a buy limit order to the order book.
 * @param orderbook - The order book contract instance.
 * @param price - The price of the order.
 * @param size - The size of the order.
 * @param postOnly - A boolean indicating whether the order should be post-only.
 * @returns A promise that resolves to a boolean indicating success or failure.
 */
async function addBuyOrder(
    orderbook: ethers.Contract,
    price: BigNumber,
    size: BigNumber,
    postOnly: boolean
): Promise<boolean> {
    try {
        const tx = await orderbook.addBuyOrder(
            price,
            size,
            postOnly
        );
        await tx.wait();
        return true; // Return true if the transaction is successful
    } catch (e: any) {
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e.error.body);
    }
}	

/**
 * @dev Adds a sell limit order to the order book.
 * @param orderbook - The order book contract instance.
 * @param price - The price of the order.
 * @param size - The size of the order.
 * @param postOnly - A boolean indicating whether the order should be post-only.
 * @returns A promise that resolves to a boolean indicating success or failure.
 */
async function addSellOrder(
    orderbook: ethers.Contract,
    price: BigNumber,
    size: BigNumber,
    postOnly: boolean
): Promise<boolean> {
    try {
        const tx = await orderbook.addSellOrder(
            price,
            size,
            postOnly
        );
        await tx.wait();
        return true; // Return true if the transaction is successful
    } catch (e: any) {
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e.error.body);
    }
}
