// ============ External Imports ============
import { ethers } from "ethers";

// ============ Internal Imports ============
import { OrderBookData, MarketParams } from "../types";
import { log10BigNumber } from "../utils";

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

        return { bids: bids.reverse(), asks: asks.reverse(), blockNumber };
    }
}
