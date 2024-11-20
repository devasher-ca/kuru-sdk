// SDK Imports
import * as KuruSdk from "../../src";
import { BATCH, LIMIT } from "../../src/types/order";
import { log10BigNumber } from "../../src/utils/math";

// Config
import * as KuruConfig from "../config.json";

// External Modules
import { BigNumber, ethers } from "ethers";
import fetch from 'cross-fetch';
import { io, Socket } from 'socket.io-client';

const { rpcUrl, contractAddress } = KuruConfig;
const privateKey = process.env.PRIVATE_KEY as string;

const BINANCE_API_URL = "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT";

// Global state management
let activeOrderIds: BigNumber[] = [];  // Tracks currently active order IDs
let currentNonce: number = 0;          // Manages transaction nonce

// Nonce management functions
// Synchronizes the nonce with the blockchain state
async function syncNonce(signer: ethers.Wallet) {
    currentNonce = await signer.getTransactionCount();
    console.log("Nonce synced to:", currentNonce);
}

function getAndIncrementNonce(): number {
    return currentNonce++;
}

interface TradeInfo {
    orderId: BigNumber;
    filledSize: BigNumber;
    price: BigNumber;
    isBuy: boolean;
}

// Event parsing functions
async function parseEvents(receipt: ethers.ContractReceipt): Promise<{
    newOrderIds: BigNumber[];
    trades: TradeInfo[];
}> {
    const newOrderIds: BigNumber[] = [];
    const trades: TradeInfo[] = [];
    
    receipt.logs.forEach((log) => {
        // Check for OrderCreated events
        if (log.topics[0] === ethers.utils.id("OrderCreated(uint40,address,uint96,uint32,bool)")) {
            try {
                const decodedLog = ethers.utils.defaultAbiCoder.decode(
                    ['uint40', 'address', 'uint96', 'uint32', 'bool'],
                    log.data
                );
                const orderId = BigNumber.from(decodedLog[0]);
                newOrderIds.push(orderId);
            } catch (error) {
                console.error("Error decoding OrderCreated event:", error);
            }
        }
        // Check for Trade events
        else if (log.topics[0] === ethers.utils.id("Trade(uint40,address,bool,uint256,uint96,address,address,uint96)")) {
            try {
                const decodedLog = ethers.utils.defaultAbiCoder.decode(
                    ['uint40', 'address', 'bool', 'uint256', 'uint96', 'address', 'address', 'uint96'],
                    log.data
                );
                trades.push({
                    orderId: BigNumber.from(decodedLog[0]),
                    price: BigNumber.from(decodedLog[3]),
                    filledSize: BigNumber.from(decodedLog[7]),
                    isBuy: decodedLog[2]
                });
            } catch (error) {
                console.error("Error decoding trade event:", error);
            }
        }
    });
    
    return { newOrderIds, trades };
}

// Price fetching function
async function getSolPrice() {
    try {
        const response = await fetch(BINANCE_API_URL);
        const data = await response.json();
        return parseFloat(data.price);
    } catch (error) {
        console.error("Error fetching SOL price from Binance:", error);
        throw error;
    }
}

interface TradeEvent {
    orderId: number;
    marketAddress: string;
    makerAddress: string;
    isBuy: boolean;
    price: string;
    updatedSize: string;
    takerAddress: string;
    filledSize: string;
    blockNumber: string;
    txIndex: number;
    logIndex: number;
    transactionHash: string;
    triggerTime: string;
}

// WebSocket order tracking class
class OrderTracker {
    // Maintains WebSocket connection to track order status
    // Handles real-time trade events and order updates
    // Manages active order tracking and cleanup
    private socket: Socket;
    private activeOrders: Set<string> = new Set();

    constructor(signerAddress: string) {
        this.socket = io(`wss://ws.staging.kuru.io?marketAddress=${signerAddress}`);
        this.setupSocketListeners();
    }

    private setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to WebSocket');
        });

        this.socket.on('Trade', (trade: TradeEvent) => {
            if (trade.marketAddress.toLowerCase() !== contractAddress.toLowerCase()) {
                return; // Ignore trades from other markets
            }

            console.log(`Trade detected for order ${trade.orderId}:`);
            console.log(`- Price: ${trade.price}`);
            console.log(`- Filled Size: ${trade.filledSize}`);
            console.log(`- Updated Size: ${trade.updatedSize}`);

            // If order is fully filled (updatedSize = 0), remove from active orders
            if (trade.updatedSize === "0") {
                const orderIdStr = BigNumber.from(trade.orderId).toString();
                if (this.activeOrders.has(orderIdStr)) {
                    this.activeOrders.delete(orderIdStr);
                    activeOrderIds = activeOrderIds.filter(id => 
                        id.toString() !== orderIdStr
                    );
                    console.log(`Order ${orderIdStr} fully filled and removed from tracking`);
                }
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket');
        });

        this.socket.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    }

    public trackOrders(orderIds: BigNumber[]) {
        orderIds.forEach(id => {
            this.activeOrders.add(id.toString());
        });
    }

    public disconnect() {
        this.socket.disconnect();
    }
}

// Market parameters management
// Implements caching for market parameters to reduce RPC calls
let cachedMarketParams: any = null;
let lastParamsFetch: number = 0;
const PARAMS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

async function getMarketParams(provider: ethers.providers.JsonRpcProvider): Promise<any> {
    const now = Date.now();
    
    // Return cached params if they're still valid
    if (cachedMarketParams && (now - lastParamsFetch) < PARAMS_CACHE_DURATION) {
        return cachedMarketParams;
    }

    // Fetch new params
    cachedMarketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, contractAddress);
    lastParamsFetch = now;
    console.log("Market params refreshed at:", new Date().toISOString());
    
    return cachedMarketParams;
}

// Core market making logic
async function updateLimitOrders(
    provider: ethers.providers.JsonRpcProvider,
    signer: ethers.Wallet, 
    basePrice: number, 
    size: number, 
    orderTracker: OrderTracker
) {
    const marketParams = await getMarketParams(provider);
    const BPS_INCREMENT = 0.001;

    try {
        const numCancels = activeOrderIds.length;
        const numNewOrders = 10;

        // Gas limit calculation:
        // Base: 250k for first order, or 75k if no new orders
        // +15k per cancel
        // +100k per additional order (excluding first)
        const baseGas = numNewOrders > 0 ? 250_000 : 75_000;
        const cancelGas = numCancels * 15_000;
        const additionalOrderGas = Math.max(0, numNewOrders - 1) * 100_000;
        const totalGasLimit = baseGas + cancelGas + additionalOrderGas;

        const batchUpdate: BATCH = {
            limitOrders: [],
            cancelOrders: activeOrderIds,
            postOnly: false,
            txOptions: {
                priorityFee: 0.001,
                nonce: getAndIncrementNonce(),
                gasLimit: ethers.BigNumber.from(totalGasLimit)
            }
        };

        // Get price precision and tick size
        const pricePrecision = BigNumber.from(marketParams.pricePrecision);
        const tickSize = BigNumber.from(marketParams.tickSize);
        const priceDecimals = log10BigNumber(pricePrecision);
        const tickDecimals = log10BigNumber(tickSize);

        // Create orders...
        for (let i = 0; i < 2; i++) {
            const rawAskPrice = basePrice * (1 + BPS_INCREMENT * (i + 1));
            // First clip to price precision
            const finalAskPrice = Number(rawAskPrice.toFixed(priceDecimals - tickDecimals));

            const askOrder: LIMIT = {
                price: finalAskPrice,
                size,
                isBuy: false,
                postOnly: false
            };
            batchUpdate.limitOrders.push(askOrder);
        }

        for (let i = 0; i < 2; i++) {
            const rawBidPrice = basePrice * (1 - BPS_INCREMENT * (i + 1));
            // First clip to price precision
            const finalBidPrice = Number(rawBidPrice.toFixed(priceDecimals - tickDecimals));

            const bidOrder: LIMIT = {
                price: finalBidPrice,
                size,
                isBuy: true,
                postOnly: false
            };
            batchUpdate.limitOrders.push(bidOrder);
        }

        // Print order details before submission
        console.log("\nOrder Details:");
        console.log("Cancelling orders:", activeOrderIds.map(id => id.toString()));
        
        console.log("\nSell Orders:");
        batchUpdate.limitOrders.slice(0, 2).forEach((order, i) => {
            console.log(`${i + 1}. Price: ${order.price}, Size: ${order.size}`);
        });
        
        console.log("\nBuy Orders:");
        batchUpdate.limitOrders.slice(2).forEach((order, i) => {
            console.log(`${i + 1}. Price: ${order.price}, Size: ${order.size}`);
        });
        console.log("\n");

        const receipt = await KuruSdk.OrderBatcher.batchUpdate(
            signer,
            contractAddress,
            marketParams,
            batchUpdate
        );

        // Parse events and update active orders
        const { newOrderIds, trades } = await parseEvents(receipt);
        activeOrderIds = newOrderIds;
        
        // Track new orders via WebSocket
        orderTracker.trackOrders(newOrderIds);
        
        console.log("Orders updated successfully!");
        console.log("Transaction hash:", receipt.transactionHash);
        console.log("New active order IDs:", activeOrderIds.map(id => id.toString()));
        
        if (trades.length > 0) {
            console.log("Trades executed:");
            trades.forEach(trade => {
                console.log(`- ${trade.isBuy ? 'Buy' : 'Sell'} order filled: Size ${trade.filledSize.toString()} @ ${trade.price.toString()}`);
            });
        }
    } catch (error) {
        console.error("Error updating limit orders:", error);
    }
}

// Main market making loop
async function startMarketMaking() {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    provider._pollingInterval = 100;
    const signer = new ethers.Wallet(privateKey, provider);
    
    // Initialize order tracker
    const orderTracker = new OrderTracker(signer.address);

    // Initial nonce sync
    await syncNonce(signer);

    // Sync nonce every 5 seconds
    setInterval(async () => {
        await syncNonce(signer);
    }, 5000);

    // Execute immediately first
    try {
        const solPrice = await getSolPrice();
        console.log("Initial SOL price:", solPrice);
        console.log("Current active orders:", activeOrderIds.map(id => id.toString()));
        
        const size = 1;
        await updateLimitOrders(provider, signer, solPrice, size, orderTracker);
    } catch (error) {
        console.error("Error in initial market making:", error);
    }

    // Then run market making every 3 seconds
    setInterval(async () => {
        try {
            const solPrice = await getSolPrice();
            console.log("Current SOL price:", solPrice);
            console.log("Current active orders:", activeOrderIds.map(id => id.toString()));
            
            const size = 1;
            await updateLimitOrders(provider, signer, solPrice, size, orderTracker);
        } catch (error) {
            console.error("Error in market making loop:", error);
        }
    }, 3000);

    // Cleanup on process exit
    process.on('SIGINT', () => {
        orderTracker.disconnect();
        process.exit();
    });
}

// Start the market maker
startMarketMaking();
