// ============ External Imports ============
import { ethers, BigNumber } from "ethers";

// ============ Internal Imports ============
import { extractErrorMessage, log10BigNumber } from "../utils";
import { MarketParams, MARKET } from "../types";

// ============ Config Imports ============
import orderbookAbi from "../../abi/OrderBook.json";
import erc20Abi from "../../abi/IERC20.json";

export abstract class IOC {
    /**
     * @dev Places a market order (buy or sell) on the order book.
     * @param providerOrSigner - The ethers.js provider or signer to interact with the blockchain.
     * @param orderbookAddress - The address of the order book contract.
     * @param marketParams - The market parameters including price and size precision.
     * @param order - The market order object containing isBuy, size, and fillOrKill properties.
     * @returns A promise that resolves to the credited size.
     */
    static async placeMarket(
        providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
        orderbookAddress: string,
        marketParams: MarketParams,
        order: MARKET
    ): Promise<number> {
        const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, providerOrSigner);

        return order.isBuy
            ? placeAndExecuteMarketBuy(
                providerOrSigner,
                orderbook,
                orderbookAddress,
                marketParams,
                order.size,
                order.fillOrKill,
            )
            : placeAndExecuteMarketSell(
                providerOrSigner,
                orderbook,
                orderbookAddress,
                marketParams,
                order.size,
                order.fillOrKill,
            );
    }
}

// ======================== INTERNAL HELPER FUNCTIONS ========================

/**
 * @dev Places and executes a market buy order.
 * @param providerOrSigner - The ethers.js provider or signer to interact with the blockchain.
 * @param orderbook - The order book contract instance.
 * @param marketAddress - The address of the market contract.
 * @param marketParams - The market parameters including price and size precision.
 * @param quoteSize - The size of the quote asset.
 * @param isFillOrKill - A boolean indicating whether the order should be fill-or-kill.
 * @returns A promise that resolves to the credited size.
 */
async function placeAndExecuteMarketBuy(
    providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
    orderbook: ethers.Contract,
    marketAddress: string,
    marketParams: MarketParams,
    quoteSize: number,
    isFillOrKill: boolean,
): Promise<number> {
    const tokenContract = new ethers.Contract(marketParams.quoteAssetAddress, erc20Abi.abi, providerOrSigner);

    await approveToken(
        tokenContract,
        marketAddress,
        ethers.utils.parseUnits(
            quoteSize.toString(),
            marketParams.quoteAssetDecimals
        )
    );

    try {
        const tx = await orderbook.placeAndExecuteMarketBuy(
            ethers.utils.parseUnits(quoteSize.toString(), log10BigNumber(marketParams.pricePrecision)),
            isFillOrKill
        );
        await tx.wait();
        return tx.value;
    } catch (e: any) {
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e.error.body);
    }
}

/**
 * @dev Places and executes a market sell order.
 * @param providerOrSigner - The ethers.js provider or signer to interact with the blockchain.
 * @param orderbook - The order book contract instance.
 * @param marketAddress - The address of the market contract.
 * @param marketParams - The market parameters including price and size precision.
 * @param size - The size of the base asset.
 * @param isFillOrKill - A boolean indicating whether the order should be fill-or-kill.
 * @returns A promise that resolves to the credited size.
 */
async function placeAndExecuteMarketSell(
    providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
    orderbook: ethers.Contract,
    marketAddress: string,
    marketParams: MarketParams,
    size: number,
    isFillOrKill: boolean,
): Promise<number> {
    const tokenContract = new ethers.Contract(marketParams.baseAssetAddress, erc20Abi.abi, providerOrSigner);

    await approveToken(
        tokenContract,
        marketAddress,
        ethers.utils.parseUnits(
            size.toString(),
            marketParams.baseAssetDecimals
        )
    );

    try {
        const tx = await orderbook.placeAndExecuteMarketSell(
            ethers.utils.parseUnits(size.toString(), log10BigNumber(marketParams.sizePrecision)),
            isFillOrKill
        );
        await tx.wait();
        return tx.value;
    } catch (e: any) {
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e.error.body);
    }
}

/**
 * @dev Approves a token for spending by the market contract.
 * @param tokenContract - The token contract instance.
 * @param marketAddress - The address of the market contract.
 * @param size - The amount of tokens to approve.
 * @returns A promise that resolves when the transaction is confirmed.
 */
async function approveToken(
    tokenContract: ethers.Contract,
    marketAddress: string,
    size: BigNumber
): Promise<void> {
    try {
        const tx = await tokenContract.approve(
            marketAddress,
            size
        );
        await tx.wait();
    } catch (e: any) {
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e.error.body);
    }
}
