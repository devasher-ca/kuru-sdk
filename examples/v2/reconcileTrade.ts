import { ethers } from 'ethers';

import * as KuruSdk from '../../src';
import * as KuruConfig from '../config.json';

const { rpcUrl, contractAddress } = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

(async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    try {
        console.log('Starting trade reconciliation example...');

        // Get market parameters
        const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, contractAddress);

        console.log('Market parameters retrieved');
        console.log('Base asset:', marketParams.baseAssetAddress);
        console.log('Quote asset:', marketParams.quoteAssetAddress);

        // Get initial orderbook state
        console.log('\n1. Getting initial orderbook...');
        let l2OrderBook = await KuruSdk.OrderBook.getL2OrderBook(provider, contractAddress, marketParams);

        console.log('Initial orderbook:');
        console.log(
            'Best Bid:',
            l2OrderBook.bids[0]
                ? `${l2OrderBook.bids[0][1].toFixed(4)} @ $${l2OrderBook.bids[0][0].toFixed(6)}`
                : 'None',
        );
        console.log(
            'Best Ask:',
            l2OrderBook.asks[0]
                ? `${l2OrderBook.asks[0][1].toFixed(4)} @ $${l2OrderBook.asks[0][0].toFixed(6)}`
                : 'None',
        );

        // Example: Execute a market buy trade
        console.log('\n2. Executing market buy trade...');
        const tradeReceipt = await KuruSdk.IOC.placeMarket(signer, contractAddress, marketParams, {
            size: '1.0',
            isBuy: true,
            minAmountOut: '0.9',
            isMargin: false,
            fillOrKill: false,
            txOptions: {
                priorityFee: 0.001,
                gasPrice: ethers.parseUnits('1', 'gwei'),
                gasLimit: 500000n,
            },
        });

        console.log('Trade executed. Hash:', tradeReceipt.hash);

        // Wait for the transaction to be mined
        console.log('\n3. Waiting for trade confirmation...');
        await new Promise((resolve) => setTimeout(resolve, 10000));

        // Get updated orderbook state
        console.log('\n4. Getting updated orderbook after trade...');
        const updatedOrderBook = await KuruSdk.OrderBook.getL2OrderBook(provider, contractAddress, marketParams);

        console.log('Updated orderbook:');
        console.log(
            'Best Bid:',
            updatedOrderBook.bids[0]
                ? `${updatedOrderBook.bids[0][1].toFixed(4)} @ $${updatedOrderBook.bids[0][0].toFixed(6)}`
                : 'None',
        );
        console.log(
            'Best Ask:',
            updatedOrderBook.asks[0]
                ? `${updatedOrderBook.asks[0][1].toFixed(4)} @ $${updatedOrderBook.asks[0][0].toFixed(6)}`
                : 'None',
        );

        // Compare the orderbooks
        console.log('\n5. Trade impact analysis:');
        if (l2OrderBook.bids[0] && updatedOrderBook.bids[0]) {
            const bidPriceChange = updatedOrderBook.bids[0][0] - l2OrderBook.bids[0][0];
            console.log(`Bid price change: ${bidPriceChange > 0 ? '+' : ''}${bidPriceChange.toFixed(6)}`);
        }

        if (l2OrderBook.asks[0] && updatedOrderBook.asks[0]) {
            const askPriceChange = updatedOrderBook.asks[0][0] - l2OrderBook.asks[0][0];
            console.log(`Ask price change: ${askPriceChange > 0 ? '+' : ''}${askPriceChange.toFixed(6)}`);
        }

        console.log('\nTrade reconciliation completed successfully!');
    } catch (error) {
        console.error('Error in trade reconciliation:', error);
    }
})();
