import { ethers } from 'ethers';

import * as KuruSdk from '../../src';
import * as KuruConfig from '../config.json';

const { rpcUrl, contractAddress } = KuruConfig;

export interface OrderBookData {
    asks: number[][];
    bids: Record<string, string>;
    blockNumber: number;
}

class OrderbookWatcher {
    private lastOrderbookJson: string | null = null;

    constructor() {}

    public startWatching(intervalMs: number = 500): void {
        setInterval(async () => {
            try {
                const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
                const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, contractAddress);

                const currentOrderbook = await KuruSdk.OrderBook.getL2OrderBook(
                    provider,
                    contractAddress,
                    marketParams,
                );
                const currentOrderbookJson = JSON.stringify(currentOrderbook, null, 4); // 4-space indentation for pretty printing
                if (this.lastOrderbookJson !== currentOrderbookJson) {
                    const asksArray = currentOrderbook.asks
                        .map(([price, quantity]) => ({ price, quantity }))
                        .sort((a, b) => a.price - b.price) // Sort asks ascending
                        .slice(0, 30)
                        .sort((a, b) => b.price - a.price); // Take first 30 asks

                    const bidsArray = currentOrderbook.bids
                        .map(([price, quantity]) => ({ price, quantity }))
                        .sort((a, b) => b.price - a.price) // Sort bids descending
                        .slice(0, 30); // Take first 30 bids

                    const maxBaseSize = Math.max(
                        ...asksArray.map((a) => a.quantity),
                        ...bidsArray.map((b) => b.quantity),
                    );
                    const maxBaseSizeLength = maxBaseSize.toString().length;
                    const printLine = (price: number, size: number, color: 'red' | 'green') => {
                        const priceStr = price.toString(); // Assuming two decimal places for price
                        const sizeStr = size.toString().padStart(maxBaseSizeLength, ' ');
                        console.log(priceStr + ' ' + `\u001b[3${color === 'green' ? 2 : 1}m` + sizeStr + '\u001b[0m');
                    };

                    console.clear();
                    console.log('=================================');
                    console.log('Asks');
                    console.log('=================================');
                    asksArray.forEach(({ price, quantity }) => {
                        if (quantity != 0) {
                            printLine(price, quantity, 'red');
                        }
                    });

                    console.log('=================================');
                    console.log('Bids');
                    console.log('=================================');
                    bidsArray.forEach(({ price, quantity }) => {
                        if (quantity != 0) {
                            printLine(price, quantity, 'green');
                        }
                    });

                    this.lastOrderbookJson = currentOrderbookJson;
                }
            } catch (error) {
                console.error('Failed to fetch or process L2 Orderbook:', error);
            }
        }, intervalMs);
    }
}

(async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    try {
        const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, contractAddress);

        const l2OrderBook = await KuruSdk.OrderBook.getL2OrderBook(provider, contractAddress, marketParams);

        console.log('L2 Order Book:');
        console.log('\nBids (highest price first):');
        l2OrderBook.bids.slice(0, 10).forEach(([price, size], index) => {
            console.log(`  ${index + 1}. ${size.toFixed(4)} @ $${price.toFixed(6)}`);
        });

        console.log('\nAsks (lowest price first):');
        l2OrderBook.asks.slice(0, 10).forEach(([price, size], index) => {
            console.log(`  ${index + 1}. ${size.toFixed(4)} @ $${price.toFixed(6)}`);
        });

        const spread = l2OrderBook.asks[0][0] - l2OrderBook.bids[0][0];
        const spreadPercent = (spread / l2OrderBook.bids[0][0]) * 100;

        console.log(`\nSpread: $${spread.toFixed(6)} (${spreadPercent.toFixed(3)}%)`);
        console.log(`Best Bid: $${l2OrderBook.bids[0][0].toFixed(6)}`);
        console.log(`Best Ask: $${l2OrderBook.asks[0][0].toFixed(6)}`);
    } catch (error) {
        console.error('Error fetching L2 order book:', error);
    }
})();
