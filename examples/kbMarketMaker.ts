import { ethers } from "ethers";
import { io } from "socket.io-client";
import * as KuruSdk from "../src";
import {
    OrderBookData,
    WssOrderEvent,
    WssCanceledOrderEvent,
    WssTradeEvent,
} from "../src/types";
import { log10BigNumber } from "../src";


const rpcUrl = "https://rpc-testnet.monadinfra.com/rpc/X1b6FBevgBoAsGnodnzmNMbOIWqQk6PK";
const contractAddress = "0x37676650654c9c2c36fcecfaea6172ee1849f9a4";
const WS_URL = `wss://ws.testnet.kuru.io`;

function printOrderBook(book: OrderBookData) {
    console.log("\n=== OrderBook Snapshot ===");
    console.log("Asks:");
    // Take last 4 asks (closest to mid price), keep them in ascending order (worst to best)
    const topAsks = book.asks.slice(-4);
    topAsks.forEach(([price, size]) => console.log(`${price} == ${size}`));
    
    console.log("\nBids:");
    // Take first 4 bids (closest to mid price), best bid first
    const topBids = book.bids.slice(0, 4);
    topBids.forEach(([price, size]) => console.log(`${price} == ${size}`));
    console.log("========================\n");
}

async function startMarketMaker() {
    // Initialize provider and get market parameters
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const marketParams = await KuruSdk.ParamFetcher.getMarketParams(
        provider,
        contractAddress
    );

    // Initialize formatted orderbook
    let l2Book = await KuruSdk.OrderBook.getFormattedL2OrderBook(
        provider,
        contractAddress,
        marketParams
    );
    console.log("Initial OrderBook:");
    printOrderBook(l2Book);

    // Initialize WebSocket connection
    const socket = io(WS_URL, {
        query: { marketAddress: contractAddress },
        transports: ["websocket"],
    });

    // Handle order creation events
    socket.on("OrderCreated", async (event) => {
        try {
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

            l2Book = KuruSdk.OrderBook.reconcileFormattedOrderCreated(
                l2Book,
                marketParams,
                orderEvent
            );
            console.log(`New ${orderEvent.isBuy ? 'Bid' : 'Ask'}: ${orderEvent.size.toString()} @ ${orderEvent.price.toString()}`);
            printOrderBook(l2Book);
            // Add your market making logic here
        } catch (error) {
            console.error("Error processing OrderCreated:", error);
        }
    });

    // Handle order cancellation events
    socket.on("OrdersCanceled", async (event) => {
        try {
            if (!l2Book) return;

            const cancelEvent: WssCanceledOrderEvent = {
                orderIds: event.orderIds,
                makerAddress: event.makerAddress,
                canceledOrdersData: event.canceledOrdersData,
            };

            l2Book = KuruSdk.OrderBook.reconcileFormattedCanceledOrders(
                l2Book,
                marketParams,
                cancelEvent
            );

            console.log("\n=== Orders Canceled Updates ===");
            console.log(`Canceled Orders: ${cancelEvent.orderIds.join(", ")}`);
            printOrderBook(l2Book);
        } catch (error) {
            console.error("Error processing OrdersCanceled:", error);
            // Refresh the orderbook on error
            l2Book = await KuruSdk.OrderBook.getFormattedL2OrderBook(
                provider,
                contractAddress,
                marketParams
            );
        }
    });

    // Handle trade events
    socket.on("Trade", (event: WssTradeEvent) => {
        l2Book = KuruSdk.OrderBook.reconcileTradeEvent(
            l2Book,
            marketParams,
            event
        );
        console.log(`Trade: ${event.filledSize} @ ${event.price}`);
        printOrderBook(l2Book);
        // Add your market making logic here
    });

    // Periodically refresh the full orderbook to ensure consistency
    setInterval(async () => {
        try {
            l2Book = await KuruSdk.OrderBook.getFormattedL2OrderBook(
                provider,
                contractAddress,
                marketParams
            );
            console.log("OrderBook Refresh:");
            printOrderBook(l2Book);
        } catch (error) {
            console.error("Error refreshing orderbook:", error);
        }
    }, 60000); // Refresh every minute
}

function printUserOrders(userOrders: { [orderId: number]: WssOrderEvent }, marketParams: KuruSdk.MarketParams) {
    console.log("\n=== User Active Orders ===");
    const bids = Object.values(userOrders).filter(order => order.isBuy);
    const asks = Object.values(userOrders).filter(order => !order.isBuy);
    
    console.log("User Asks:");
    asks.sort((a, b) => a.price.gt(b.price) ? 1 : -1)
        .forEach(order => console.log(
            `OrderId: ${order.orderId} - Size: ${ethers.utils.formatUnits(order.size, log10BigNumber(marketParams.sizePrecision))} @ ${ethers.utils.formatUnits(order.price, log10BigNumber(marketParams.pricePrecision))}`
        ));
    
    console.log("\nUser Bids:");
    bids.sort((a, b) => a.price.gt(b.price) ? -1 : 1)
        .forEach(order => console.log(
            `OrderId: ${order.orderId} - Size: ${ethers.utils.formatUnits(order.size, log10BigNumber(marketParams.sizePrecision))} @ ${ethers.utils.formatUnits(order.price, log10BigNumber(marketParams.pricePrecision))}`
        ));
    console.log("========================\n");
}

async function startUserOrderTracking(userAddress: string) {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const marketParams = await KuruSdk.ParamFetcher.getMarketParams(
        provider,
        contractAddress
    );

    // Initialize user-specific socket connection
    const userSocket = io(WS_URL, {
        query: { 
            marketAddress: contractAddress,
            userAddress: userAddress 
        },
        transports: ["websocket"],
    });

    // Track user's active orders
    let userOrders: { [orderId: number]: WssOrderEvent } = {};

    // Print initial empty state
    printUserOrders(userOrders, marketParams);

    // Handle user's order creation events
    userSocket.on("OrderCreated", async (event) => {
        try {
            if (event.owner.toLowerCase() === userAddress.toLowerCase()) {
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
                
                userOrders[event.orderId] = orderEvent;
                console.log(`User New Order: ${orderEvent.isBuy ? 'Bid' : 'Ask'} - Size: ${orderEvent.size.toString()} @ ${orderEvent.price.toString()}`);
                printUserOrders(userOrders, marketParams);
            }
        } catch (error) {
            console.error("Error processing user OrderCreated:", error);
        }
    });

    // Handle user's order cancellation events
    userSocket.on("OrdersCanceled", async (event) => {
        try {
            if (event.makerAddress.toLowerCase() === userAddress.toLowerCase()) {
                event.orderIds.forEach((orderId: number) => {
                    delete userOrders[orderId];
                });
                console.log(`User Orders Canceled: ${event.orderIds.join(", ")}`);
                printUserOrders(userOrders, marketParams);
            }
        } catch (error) {
            console.error("Error processing user OrdersCanceled:", error);
        }
    });

    // Handle user's trade events
    userSocket.on("Trade", (event: WssTradeEvent) => {
        try {
            if (event.makerAddress.toLowerCase() === userAddress.toLowerCase() || 
                event.takerAddress.toLowerCase() === userAddress.toLowerCase()) {
                
                console.log(`User Trade: ${event.filledSize} @ ${event.price}`);
                
                if (event.makerAddress.toLowerCase() === userAddress.toLowerCase() && 
                    userOrders[event.orderId]) {
                    const updatedSize = ethers.BigNumber.from(event.updatedSize);
                    if (updatedSize.isZero()) {
                        delete userOrders[event.orderId];
                    } else {
                        userOrders[event.orderId].size = updatedSize;
                    }
                    printUserOrders(userOrders, marketParams);
                }
            }
        } catch (error) {
            console.error("Error processing user Trade:", error);
        }
    });
}

// Start both market maker and user tracking
Promise.all([
    startMarketMaker(),
    startUserOrderTracking("0x3442dba7f6713760D0C6CFF07131A08E0666252e")
]).catch((error) => {
    console.error("Error starting services:", error);
});
