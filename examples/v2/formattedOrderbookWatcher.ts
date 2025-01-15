import { io, Socket } from "socket.io-client";
import { ethers } from "ethers";
import * as KuruSdk from "../../src";
import * as KuruConfig from "../config.json";
import {
    OrderBookData,
    WssOrderEvent,
    WssCanceledOrderEvent,
    WssTradeEvent,
} from "../../src/types";

const { rpcUrl, contractAddress } = KuruConfig;
const WS_URL = `wss://ws.staging.kuru.io`;

class OrderbookWatcher {
    private socket: Socket;
    private localOrderbook: OrderBookData | null = null;
    private provider: ethers.providers.JsonRpcProvider;
    private marketParams: any;
    private lastProcessedBlock: number = 0;

    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        this.socket = io(WS_URL, {
            query: { marketAddress: contractAddress },
            transports: ["websocket"],
        });
        this.setupSocketListeners();
    }

    private async initialize() {
        try {
            this.marketParams = await KuruSdk.ParamFetcher.getMarketParams(
                this.provider,
                contractAddress
            );
            await this.fetchAndUpdateOrderbook();
        } catch (error) {
            console.error("Initialization error:", error);
        }
    }

    private async fetchAndUpdateOrderbook() {
        try {
            const fetchedOrderbook = await KuruSdk.OrderBook.getFormattedL2OrderBook(
                this.provider,
                contractAddress,
                this.marketParams
            );
            this.localOrderbook = fetchedOrderbook;
        } catch (error) {
            console.error("Error fetching orderbook:", error);
        }
    }

    private setupSocketListeners() {
        this.socket.on("connect", async () => {
            console.log("Socket connected");
            await this.initialize();
        });

        this.socket.on("OrderCreated", async (event) => {
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

                // Store the orderbook state before reconciliation
                const beforeOrderbook = JSON.parse(JSON.stringify(this.localOrderbook));

                await this.handleReconciliation(() =>
                    this.localOrderbook = KuruSdk.OrderBook.reconcileFormattedOrderCreated(
                        this.localOrderbook!,
                        this.marketParams,
                        orderEvent
                    )
                );

                // Compare and print changes after reconciliation
                if (this.localOrderbook) {
                    console.log("\n=== Order Created Updates ===");
                    console.log(`New Order: ${orderEvent.size.toString()} @ ${orderEvent.price.toString()}`);
                    
                    console.log("Before orderbook first few entries:");
                    console.log("Asks:", beforeOrderbook.asks.slice(-3));
                    console.log("Bids:", beforeOrderbook.bids.slice(0, 3));

                    console.log("After orderbook first few entries:");
                    console.log("Asks:", this.localOrderbook.asks.slice(-3));
                    console.log("Bids:", this.localOrderbook.bids.slice(0, 3));

                    console.log("========================\n");
                }
            } catch (error) {
                console.error("Error processing OrderCreated:", error);
            }
        });

        this.socket.on("Trade", async (event) => {
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
                const beforeOrderbook = JSON.parse(
                    JSON.stringify(this.localOrderbook)
                );

                this.localOrderbook = KuruSdk.OrderBook.reconcileFormattedTradeEvent(
                    this.localOrderbook!,
                    this.marketParams,
                    tradeEvent
                );

                // Compare and print changes after reconciliation
                if (this.localOrderbook) {
                    console.log("\n=== Trade Event Updates ===");
                    console.log(
                        `Trade: ${tradeEvent.filledSize} @ ${tradeEvent.price}`
                    );

                    // Debug logging
                    console.log("Before orderbook first few entries:");
                    console.log("Asks:", beforeOrderbook.asks.slice(-3));
                    console.log("Bids:", beforeOrderbook.bids.slice(0, 3));

                    console.log("After orderbook first few entries:");
                    console.log("Asks:", this.localOrderbook.asks.slice(-3));
                    console.log("Bids:", this.localOrderbook.bids.slice(0, 3));

                    console.log("========================\n");
                }
            } catch (error) {
                console.error("Error processing Trade:", error);
            }
        });

        this.socket.on("OrdersCanceled", async (event) => {
            try {
                if (!this.localOrderbook) return;

                const cancelEvent: WssCanceledOrderEvent = {
                    orderIds: event.orderIds,
                    makerAddress: event.makerAddress,
                    canceledOrdersData: event.canceledOrdersData,
                };

                // Store the orderbook state before reconciliation
                const beforeOrderbook = JSON.parse(JSON.stringify(this.localOrderbook));

                await this.handleReconciliation(() =>
                    this.localOrderbook = KuruSdk.OrderBook.reconcileFormattedCanceledOrders(
                        this.localOrderbook!,
                        this.marketParams,
                        cancelEvent
                    )
                );

                // Compare and print changes after reconciliation
                if (this.localOrderbook) {
                    console.log("\n=== Orders Canceled Updates ===");
                    console.log(`Canceled Orders: ${cancelEvent.orderIds.join(", ")}`);
                    
                    console.log("Before orderbook first few entries:");
                    console.log("Asks:", beforeOrderbook.asks.slice(-3));
                    console.log("Bids:", beforeOrderbook.bids.slice(0, 3));

                    console.log("After orderbook first few entries:");
                    console.log("Asks:", this.localOrderbook.asks.slice(-3));
                    console.log("Bids:", this.localOrderbook.bids.slice(0, 3));

                    console.log("========================\n");
                }
            } catch (error) {
                console.error("Error processing OrdersCanceled:", error);
            }
        });

        this.socket.on("disconnect", () => {
            console.log("Socket disconnected");
        });

        this.socket.on("error", (error) => {
            console.error("Socket error:", error);
        });
    }

    private async handleReconciliation(reconcileFunc: () => OrderBookData) {
        try {
            // Execute the reconciliation once and store the result
            const result = reconcileFunc();
            const currentBlock = Number(result.blockNumber || 0);
            
            // Update the orderbook immediately
            this.localOrderbook = result;

            if (currentBlock > this.lastProcessedBlock) {
                this.lastProcessedBlock = currentBlock;
            }
        } catch (error) {
            console.error("Error in reconciliation:", error);
            await this.fetchAndUpdateOrderbook();
        }
    }

    public disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Start the watcher
const watcher = new OrderbookWatcher();

// Handle process termination
process.on("SIGINT", () => {
    console.log("Shutting down...");
    watcher.disconnect();
    process.exit();
});
