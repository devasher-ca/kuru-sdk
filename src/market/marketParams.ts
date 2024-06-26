// ============ External Imports ============
import { ethers, BigNumber } from "ethers";

// ============ Internal Imports ============
import { MarketParams } from "../types";

// ============ Config Imports ============
import orderbookAbi from "../../abi/OrderBook.json";

/**
 * @dev Retrieves the market parameters from the order book contract.
 * @param provider - The ethers.js provider to interact with the blockchain.
 * @param orderbookAddress - The address of the order book contract.
 * @returns A promise that resolves to the market parameters.
 */
export async function getMarketParams(
    provider: ethers.providers.JsonRpcProvider,
    orderbookAddress: string,
): Promise<MarketParams> {
    const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, provider);

    const marketParamsData = await orderbook.getMarketParams();
    return {
        pricePrecision: BigNumber.from(marketParamsData[0]),
        sizePrecision: BigNumber.from(marketParamsData[1]),
        baseAssetAddress: marketParamsData[2],
        baseAssetDecimals: BigNumber.from(marketParamsData[3]),
        quoteAssetAddress: marketParamsData[4],
        quoteAssetDecimals: BigNumber.from(marketParamsData[5]),
    };
}