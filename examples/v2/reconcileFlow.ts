import { ethers } from 'ethers';

import * as KuruSdk from '../../src';
import * as KuruConfig from '../config.json';
import { WssOrderEvent, WssCanceledOrderEvent, WssTradeEvent } from '../../src/types';

const { rpcUrl, contractAddress } = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

(async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    try {
        console.log('Starting reconcile flow example...');

        // Get market parameters
        const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, contractAddress);

        console.log('Market parameters retrieved');
        console.log('Base asset:', marketParams.baseAssetAddress);
        console.log('Quote asset:', marketParams.quoteAssetAddress);

        // Example: Place a limit buy order first
        console.log('\n1. Placing limit buy order...');
        const buyReceipt = await KuruSdk.GTC.placeLimit(signer, contractAddress, marketParams, {
            price: '0.95',
            size: '10.0',
            isBuy: true,
            postOnly: true,
            txOptions: {
                priorityFee: 0.001,
                gasPrice: ethers.parseUnits('1', 'gwei'),
                gasLimit: 500000n,
            },
        });

        console.log('Buy order placed. Hash:', buyReceipt.hash);

        // Wait a bit
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Example: Place a limit sell order
        console.log('\n2. Placing limit sell order...');
        const sellReceipt = await KuruSdk.GTC.placeLimit(signer, contractAddress, marketParams, {
            price: '1.05',
            size: '10.0',
            isBuy: false,
            postOnly: true,
            txOptions: {
                priorityFee: 0.001,
                gasPrice: ethers.parseUnits('1', 'gwei'),
                gasLimit: 500000n,
            },
        });

        console.log('Sell order placed. Hash:', sellReceipt.hash);

        // Example: Check orderbook
        console.log('\n3. Checking orderbook...');
        const l2OrderBook = await KuruSdk.OrderBook.getL2OrderBook(provider, contractAddress, marketParams);

        console.log('Top 3 bids:');
        l2OrderBook.bids.slice(0, 3).forEach(([price, size], index) => {
            console.log(`  ${index + 1}. ${size.toFixed(4)} @ $${price.toFixed(6)}`);
        });

        console.log('Top 3 asks:');
        l2OrderBook.asks.slice(0, 3).forEach(([price, size], index) => {
            console.log(`  ${index + 1}. ${size.toFixed(4)} @ $${price.toFixed(6)}`);
        });

        console.log('\nReconcile flow completed successfully!');
    } catch (error) {
        console.error('Error in reconcile flow:', error);
    }
})();
