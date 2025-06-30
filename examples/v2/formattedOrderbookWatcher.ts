import { ethers } from 'ethers';

import * as KuruSdk from '../../src';
import * as KuruConfig from '../config.json';

const { rpcUrl, contractAddress } = KuruConfig;

// Formatted orderbook watcher implementation
class FormattedOrderbookWatcher {
    private provider: ethers.JsonRpcProvider;
    private intervalId?: NodeJS.Timeout;
    private pollingInterval: number;

    constructor(pollingInterval: number = 500) {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.pollingInterval = pollingInterval;
    }

    async startWatching() {
        console.log(`Starting formatted orderbook watcher for ${contractAddress}`);
        console.log(`Polling interval: ${this.pollingInterval}ms\n`);

        // Initial fetch
        await this.fetchAndDisplayFormattedOrderbook();

        // Set up polling
        this.intervalId = setInterval(async () => {
            await this.fetchAndDisplayFormattedOrderbook();
        }, this.pollingInterval);
    }

    stopWatching() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
            console.log('Formatted orderbook watcher stopped');
        }
    }

    private async fetchAndDisplayFormattedOrderbook() {
        try {
            const marketParams = await KuruSdk.ParamFetcher.getMarketParams(this.provider, contractAddress);
            const l2OrderBook = await KuruSdk.OrderBook.getFormattedL2OrderBook(
                this.provider,
                contractAddress,
                marketParams,
            );

            console.clear();
            console.log(`=== Formatted Orderbook for ${contractAddress} ===`);
            console.log(`Timestamp: ${new Date().toLocaleTimeString()}\n`);

            console.log('ASKS (Sell Orders) - Human Readable');
            console.log('Price\t\tSize\t\tTotal Value');
            console.log('─'.repeat(50));
            l2OrderBook.asks
                .slice(0, 5)
                .reverse()
                .forEach(([price, size]) => {
                    console.log(`$${price.toFixed(6)}\t${size.toFixed(4)}\t$${(price * size).toFixed(2)}`);
                });

            console.log('\nBIDS (Buy Orders) - Human Readable');
            console.log('Price\t\tSize\t\tTotal Value');
            console.log('─'.repeat(50));
            l2OrderBook.bids.slice(0, 5).forEach(([price, size]) => {
                console.log(`$${price.toFixed(6)}\t${size.toFixed(4)}\t$${(price * size).toFixed(2)}`);
            });

            const spread = l2OrderBook.asks[0][0] - l2OrderBook.bids[0][0];
            const spreadPercent = (spread / l2OrderBook.bids[0][0]) * 100;
            const midPrice = (l2OrderBook.asks[0][0] + l2OrderBook.bids[0][0]) / 2;

            console.log(`\n📊 Market Statistics:`);
            console.log(`Mid Price: $${midPrice.toFixed(6)}`);
            console.log(`Spread: $${spread.toFixed(6)} (${spreadPercent.toFixed(3)}%)`);
            console.log(`Best Bid: $${l2OrderBook.bids[0][0].toFixed(6)}`);
            console.log(`Best Ask: $${l2OrderBook.asks[0][0].toFixed(6)}`);

            // Calculate total liquidity within 1% of mid price
            const priceRange = midPrice * 0.01;
            const bidLiquidity = l2OrderBook.bids
                .filter(([price]) => price >= midPrice - priceRange)
                .reduce((sum, [price, size]) => sum + price * size, 0);
            const askLiquidity = l2OrderBook.asks
                .filter(([price]) => price <= midPrice + priceRange)
                .reduce((sum, [price, size]) => sum + price * size, 0);

            console.log(`\n💧 Liquidity within 1% of mid:`);
            console.log(`Bid Liquidity: $${bidLiquidity.toFixed(2)}`);
            console.log(`Ask Liquidity: $${askLiquidity.toFixed(2)}`);
            console.log(`Total Liquidity: $${(bidLiquidity + askLiquidity).toFixed(2)}`);
        } catch (error) {
            console.error('Error fetching formatted orderbook:', error);
        }
    }
}

(async () => {
    const watcher = new FormattedOrderbookWatcher();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down formatted orderbook watcher...');
        watcher.stopWatching();
        process.exit(0);
    });

    await watcher.startWatching();
})();
