// ============ External Imports ============
import { ethers, BigNumber } from "ethers";

// ============ Internal Imports ============
import { OrderBookData, MarketParams, VaultParams } from "../types";
import { log10BigNumber, mulDivRound } from "../utils";

// ============ Config Imports ============
import orderbookAbi from "../../abi/OrderBook.json";

export abstract class OrderBook {
    /**
     * @dev Retrieves the Level 2 order book data from the order book contract.
     * @param providerOrSigner - The ethers.js provider to interact with the blockchain.
     * @param orderbookAddress - The address of the order book contract.
     * @param marketParams - The market parameters including price and size precision.
     * @returns A promise that resolves to the order book data.
     */
    static async getL2OrderBook(
        providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
        orderbookAddress: string,
        marketParams: MarketParams
    ): Promise<OrderBookData> {
        const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, providerOrSigner);
        const data = await orderbook.getL2Book();

        let offset = 66; // Start reading after the block number
        const blockNumber = parseInt(data.slice(2, 66), 16); // The block number is stored in the first 64 bytes after '0x'

        let bids: number[][] = [];
        let asks: number[][] = [];

        // Decode bids
        while (offset < data.length) {
            const price = parseInt(data.slice(offset, offset + 64), 16);
            offset += 64; // Skip over padding
            if (price === 0) {
                break; // Stop reading if price is zero
            }
            const size = parseInt(data.slice(offset, offset + 64), 16);
            offset += 64; // Skip over padding
            bids.push([
                parseFloat(ethers.utils.formatUnits(price, log10BigNumber(marketParams.pricePrecision))),
                parseFloat(ethers.utils.formatUnits(size, log10BigNumber(marketParams.sizePrecision)))
            ]);
        }

        // Decode asks
        while (offset < data.length) {
            const price = parseInt(data.slice(offset, offset + 64), 16);
            offset += 64; // Skip over padding
            if (price === 0) {
                break; // Stop reading if price is zero
            }
            const size = parseInt(data.slice(offset, offset + 64), 16);
            offset += 64; // Skip over padding
            asks.push([
                parseFloat(ethers.utils.formatUnits(price, log10BigNumber(marketParams.pricePrecision))),
                parseFloat(ethers.utils.formatUnits(size, log10BigNumber(marketParams.sizePrecision)))
            ]);
        }

        // Get AMM Prices
        const ammPrices = await getAmmPrices(providerOrSigner, orderbookAddress, marketParams);

        // Combine AMM Prices with Order Book Prices
        const combinedBids = combinePrices(bids, ammPrices.bids);
        const combinedAsks = combinePrices(asks, ammPrices.asks);

        // Sort bids and asks in decreasing order of price
        combinedBids.sort((a, b) => b[0] - a[0]);
        combinedAsks.sort((a, b) => b[0] - a[0]);

        return { bids: combinedBids, asks: combinedAsks, blockNumber };
    }
}

/**
 * @dev Retrieves only the AMM prices from the order book contract.
 * @param providerOrSigner - The ethers.js provider to interact with the blockchain.
 * @param orderbookAddress - The address of the order book contract.
 * @param marketParams - The market parameters including price and size precision.
 * @returns A promise that resolves to the AMM prices data.
 */
async function getAmmPrices(
    providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
    orderbookAddress: string,
    marketParams: MarketParams
): Promise<{ bids: number[][], asks: number[][] }> {
    const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, providerOrSigner);
    const vaultParamsData = await orderbook.getVaultParams();

    const vaultParams: VaultParams = {
        kuruAmmVault: vaultParamsData[0],
        vaultBestBid: vaultParamsData[1],
        bidPartiallyFilledSize: BigNumber.from(vaultParamsData[2]),
        vaultBestAsk: vaultParamsData[3],
        askPartiallyFilledSize: BigNumber.from(vaultParamsData[4]),
        vaultOrderSize: BigNumber.from(vaultParamsData[5]),
    };

    let {vaultBestAsk, vaultBestBid, vaultOrderSize, bidPartiallyFilledSize, askPartiallyFilledSize} = vaultParams;

    let bids: number[][] = [];
    let asks: number[][] = [];

    const vaultOrderSizeAsFloat = parseFloat(ethers.utils.formatUnits(vaultOrderSize, log10BigNumber(marketParams.sizePrecision)));
    const firstBidOrderSizeAsFloat = parseFloat(ethers.utils.formatUnits(vaultOrderSize.sub(bidPartiallyFilledSize), log10BigNumber(marketParams.sizePrecision)));
    const firstAskOrderSizeAsFloat = parseFloat(ethers.utils.formatUnits(vaultOrderSize.sub(askPartiallyFilledSize), log10BigNumber(marketParams.sizePrecision)));

    if (vaultOrderSize < marketParams.minSize) {
        return { bids, asks };
    }

    if (vaultParams.kuruAmmVault !== ethers.constants.AddressZero) {
        const a =  ethers.utils.formatUnits(vaultBestBid, log10BigNumber(marketParams.pricePrecision));
        // Add vault bid orders to AMM prices
        for (let i = 0; i < 30; i++) {
            if (vaultBestBid === 0) break;
            bids.push([
                parseFloat(ethers.utils.formatUnits(vaultBestBid, log10BigNumber(marketParams.pricePrecision))),
                i === 0 ? firstBidOrderSizeAsFloat : vaultOrderSizeAsFloat
            ]);
            vaultBestBid = mulDivRound(vaultBestBid, 1000, 1003);
        }

        // Add vault ask orders to AMM prices
        for (let i = 0; i < 30; i++) {
            if (vaultBestAsk >= Math.pow(2, 24) - 1) break;
            asks.push([
                parseFloat(ethers.utils.formatUnits(vaultBestAsk, log10BigNumber(marketParams.pricePrecision))),
                i === 0 ? firstAskOrderSizeAsFloat : vaultOrderSizeAsFloat
            ]);
            vaultBestAsk = mulDivRound(vaultBestAsk, 1003, 1000);
        }
    }

    return { bids, asks };
}

/**
 * @dev Combines two price arrays, summing sizes for duplicate prices.
 * @param originalPrices - The original prices array.
 * @param additionalPrices - The additional prices array to merge.
 * @returns The combined prices array.
 */
function combinePrices(originalPrices: number[][], additionalPrices: number[][]): number[][] {
    const priceMap = new Map<number, number>();

    // Add original prices to map
    originalPrices.forEach(([price, size]) => {
        priceMap.set(price, (priceMap.get(price) || 0) + size);
    });

    // Add additional prices to map
    additionalPrices.forEach(([price, size]) => {
        priceMap.set(price, (priceMap.get(price) || 0) + size);
    });

    // Convert map back to array
    return Array.from(priceMap.entries()).map(([price, size]) => [price, size]);
}
