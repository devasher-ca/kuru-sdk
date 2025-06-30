import { io, Socket } from 'socket.io-client';
import { ethers } from 'ethers';
import * as KuruSdk from '../../src';
import * as KuruConfig from '../config.json';
import { OrderBookData, WssOrderEvent, WssCanceledOrderEvent, WssTradeEvent } from '../../src/types';

const { rpcUrl, contractAddress } = KuruConfig;
const WS_URL = `wss://ws.staging.kuru.io`;

class OrderbookWatcher {
    private socket: Socket;
    private localOrderbook: OrderBookData | null = null;
    private provider: ethers.providers.JsonRpcProvider;
    private marketParams: any;
    private eventQueue: Map<number, (() => OrderBookData)[]> = new Map();
    private lastProcessedBlock: number = 0;
    private intervalId?: NodeJS.Timeout;
    private pollingInterval: number;

    constructor(pollingInterval: number = 500) {
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        this.socket = io(WS_URL, {
            query: { marketAddress: contractAddress },
            transports: ['websocket'],
        });
        this.pollingInterval = pollingInterval;
        this.setupSocketListeners();
    }

    private async initialize() {
        try {
            this.marketParams = await KuruSdk.ParamFetcher.getMarketParams(this.provider, contractAddress);
            await this.fetchAndUpdateOrderbook();
        } catch (error) {
            console.error('Initialization error:', error);
        }
    }

    private async fetchAndUpdateOrderbook() {
        try {
            const fetchedOrderbook = await KuruSdk.OrderBook.getL2OrderBook(
                this.provider,
                contractAddress,
                this.marketParams,
            );
            this.localOrderbook = fetchedOrderbook;
        } catch (error) {
            console.error('Error fetching orderbook:', error);
        }
    }

    private setupSocketListeners() {
        this.socket.on('connect', async () => {
            console.log('Socket connected');
            await this.initialize();
        });

        this.socket.on('OrderCreated', async (event) => {
            try {
                if (!this.localOrderbook) return;

                const orderEvent: WssOrderEvent = {
                    orderId: event.orderId,
                    owner: event.owner,
                    size: ethers.BigNumber.from(event.size),
                    price: ethers.BigNumber.from(event.price),
                    isBuy: event.isBuy,
                    blockNumber: ethers.BigNumber.from(event.blockNumber),
                    transactionHash: event.transactionHash,
                    triggerTime: event.triggerTime,
                    marketAddress: event.marketAddress,
                };

                await this.handleReconciliation(() =>
                    KuruSdk.OrderBook.reconcileOrderCreated(this.localOrderbook!, this.marketParams, orderEvent),
                );
            } catch (error) {
                console.error('Error processing OrderCreated:', error);
            }
        });

        this.socket.on('Trade', async (event) => {
            try {
                if (!this.localOrderbook) return;

                const tradeEvent: WssTradeEvent = {
                    orderId: event.orderId,
                    makerAddress: event.makerAddress,
                    isBuy: event.isBuy,
                    price: event.price,
                    updatedSize: event.updatedSize,
                    takerAddress: event.takerAddress,
                    filledSize: event.filledSize,
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash,
                    triggerTime: event.triggerTime,
                };

                // Store the orderbook state before reconciliation
                const beforeOrderbook = JSON.parse(JSON.stringify(this.localOrderbook));

                this.localOrderbook = KuruSdk.OrderBook.reconcileTradeEvent(
                    this.localOrderbook!,
                    this.marketParams,
                    tradeEvent,
                );

                // Compare and print changes after reconciliation
                if (this.localOrderbook) {
                    console.log('\n=== Trade Event Updates ===');
                    console.log(`Trade: ${tradeEvent.filledSize} @ ${tradeEvent.price}`);

                    // Debug logging
                    console.log('Before orderbook first few entries:');
                    console.log('Asks:', beforeOrderbook.asks.slice(0, 3));
                    console.log('Bids:', beforeOrderbook.bids.slice(0, 3));

                    console.log('After orderbook first few entries:');
                    console.log('Asks:', this.localOrderbook.asks.slice(0, 3));
                    console.log('Bids:', this.localOrderbook.bids.slice(0, 3));

                    // Existing comparison logic
                    beforeOrderbook.asks.forEach((ask: any, index: number) => {
                        if (index >= this.localOrderbook!.asks.length) return;
                        const newAsk = this.localOrderbook!.asks[index];
                        if (ask[0] !== newAsk[0] || ask[1] !== newAsk[1]) {
                            console.log(`Ask Updated [${index}]: ${ask[0]}@${ask[1]} -> ${newAsk[0]}@${newAsk[1]}`);
                        }
                    });

                    beforeOrderbook.bids.forEach((bid: any, index: number) => {
                        if (index >= this.localOrderbook!.bids.length) return;
                        const newBid = this.localOrderbook!.bids[index];
                        if (bid[0] !== newBid[0] || bid[1] !== newBid[1]) {
                            console.log(`Bid Updated [${index}]: ${bid[0]}@${bid[1]} -> ${newBid[0]}@${newBid[1]}`);
                        }
                    });
                    console.log('========================\n');
                }
            } catch (error) {
                console.error('Error processing Trade:', error);
            }
        });

        this.socket.on('OrdersCanceled', async (event) => {
            try {
                if (!this.localOrderbook) return;

                const cancelEvent: WssCanceledOrderEvent = {
                    orderIds: event.orderIds,
                    makerAddress: event.makerAddress,
                    canceledOrdersData: event.canceledOrdersData,
                };

                await this.handleReconciliation(() =>
                    KuruSdk.OrderBook.reconcileCanceledOrders(this.localOrderbook!, this.marketParams, cancelEvent),
                );
            } catch (error) {
                console.error('Error processing OrdersCanceled:', error);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    }

    private async handleReconciliation(reconcileFunc: () => OrderBookData) {
        try {
            const currentBlock = this.getCurrentBlockFromEvent(reconcileFunc);

            if (!this.eventQueue.has(currentBlock)) {
                this.eventQueue.set(currentBlock, []);
            }
            this.eventQueue.get(currentBlock)!.push(reconcileFunc);

            if (currentBlock > this.lastProcessedBlock) {
                if (this.eventQueue.has(this.lastProcessedBlock)) {
                    const events = this.eventQueue.get(this.lastProcessedBlock)!;
                    let updatedOrderbook = this.localOrderbook!;

                    for (const event of events) {
                        updatedOrderbook = event();
                    }

                    const fetchedOrderbook = await KuruSdk.OrderBook.getL2OrderBook(
                        this.provider,
                        contractAddress,
                        this.marketParams,
                    );

                    const areEqual = this.areOrderbooksEqual(updatedOrderbook, fetchedOrderbook);
                    console.log(
                        `Block ${this.lastProcessedBlock} - Orderbooks are ${areEqual ? 'equal' : 'not equal'}`,
                    );

                    this.localOrderbook = areEqual ? updatedOrderbook : fetchedOrderbook;

                    this.eventQueue.delete(this.lastProcessedBlock);
                }

                this.lastProcessedBlock = currentBlock;
            }
        } catch (error) {
            console.error('Error in reconciliation:', error);
            await this.fetchAndUpdateOrderbook();
        }
    }

    private getCurrentBlockFromEvent(reconcileFunc: () => OrderBookData): number {
        try {
            const result = reconcileFunc();
            return Number(result.blockNumber || 0);
        } catch {
            return 0;
        }
    }

    private areOrderbooksEqual(a: OrderBookData, b: OrderBookData): boolean {
        // Check asks
        const asksEqual =
            a.asks.length === b.asks.length &&
            a.asks.every((askA, index) => {
                const askB = b.asks[index];
                const isEqual = askA[0] === askB[0] && askA[1] === askB[1];
                if (!isEqual) {
                    console.log(`Ask mismatch at index ${index}:`);
                    console.log(`Expected: price=${askA[0]}, size=${askA[1]}`);
                    console.log(`Actual: price=${askB[0]}, size=${askB[1]}`);
                }
                return isEqual;
            });

        // Check bids
        const bidsEqual =
            a.bids.length === b.bids.length &&
            a.bids.every((bidA, index) => {
                const bidB = b.bids[index];
                const isEqual = bidA[0] === bidB[0] && bidA[1] === bidB[1];
                if (!isEqual) {
                    console.log(`Bid mismatch at index ${index}:`);
                    console.log(`Expected: price=${bidA[0]}, size=${bidA[1]}`);
                    console.log(`Actual: price=${bidB[0]}, size=${bidB[1]}`);
                }
                return isEqual;
            });

        if (a.asks.length !== b.asks.length) {
            console.log(`Ask length mismatch: Expected ${a.asks.length}, got ${b.asks.length}`);
        }
        if (a.bids.length !== b.bids.length) {
            console.log(`Bid length mismatch: Expected ${a.bids.length}, got ${b.bids.length}`);
        }

        return asksEqual && bidsEqual;
    }

    public disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    async startWatching() {
        console.log(`Starting orderbook watcher for ${contractAddress}`);
        console.log(`Polling interval: ${this.pollingInterval}ms\n`);

        // Initial fetch
        await this.fetchAndDisplayOrderbook();

        // Set up polling
        this.intervalId = setInterval(async () => {
            await this.fetchAndDisplayOrderbook();
        }, this.pollingInterval);
    }

    stopWatching() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
            console.log('Orderbook watcher stopped');
        }
    }

    private async fetchAndDisplayOrderbook() {
        try {
            const marketParams = await KuruSdk.ParamFetcher.getMarketParams(this.provider, contractAddress);
            const l2OrderBook = await KuruSdk.OrderBook.getL2OrderBook(this.provider, contractAddress, marketParams);

            console.clear();
            console.log(`=== Orderbook for ${contractAddress} ===`);
            console.log(`Timestamp: ${new Date().toLocaleTimeString()}\n`);

            console.log('ASKS (Sell Orders)');
            console.log('Price\t\tSize\t\tTotal');
            console.log('─'.repeat(40));
            l2OrderBook.asks
                .slice(0, 5)
                .reverse()
                .forEach(([price, size]) => {
                    console.log(`${price.toFixed(6)}\t${size.toFixed(4)}\t${(price * size).toFixed(2)}`);
                });

            console.log('\nBIDS (Buy Orders)');
            console.log('Price\t\tSize\t\tTotal');
            console.log('─'.repeat(40));
            l2OrderBook.bids.slice(0, 5).forEach(([price, size]) => {
                console.log(`${price.toFixed(6)}\t${size.toFixed(4)}\t${(price * size).toFixed(2)}`);
            });

            const spread = l2OrderBook.asks[0][0] - l2OrderBook.bids[0][0];
            const spreadPercent = (spread / l2OrderBook.bids[0][0]) * 100;

            console.log(`\nSpread: $${spread.toFixed(6)} (${spreadPercent.toFixed(3)}%)`);
            console.log(`Best Bid: $${l2OrderBook.bids[0][0].toFixed(6)}`);
            console.log(`Best Ask: $${l2OrderBook.asks[0][0].toFixed(6)}`);
        } catch (error) {
            console.error('Error fetching orderbook:', error);
        }
    }
}

(async () => {
    const watcher = new OrderbookWatcher();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down orderbook watcher...');
        watcher.stopWatching();
        process.exit(0);
    });

    await watcher.startWatching();
})();
