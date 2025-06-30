import { ethers } from 'ethers';

import * as KuruSdk from '../../src';
import * as KuruConfig from '../config.json';

const { rpcUrl, contractAddress } = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

const args = process.argv.slice(2);
const startPrice = parseFloat(args[0]) || 0.95;
const endPrice = parseFloat(args[1]) || 1.05;
const quoteLiquidity = parseFloat(args[2]) || 1000;

// Helper function to create ASCII bar graph
function createAsciiGraph(data: number[], maxBars: number = 50): string {
    const max = Math.max(...data);
    return data
        .map((value) => {
            const barLength = Math.round((value / max) * maxBars);

            return '█'.repeat(barLength) + ' '.repeat(maxBars - barLength) + ` (${value.toFixed(4)})`;
        })
        .join('\n');
}

(async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    try {
        console.log('Starting spot concentrated liquidity example...');
        console.log(`Price range: $${startPrice} - $${endPrice}`);
        console.log(`Quote liquidity: ${quoteLiquidity}`);

        // Get market parameters
        const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, contractAddress);

        console.log('\nMarket parameters:');
        console.log('Base asset:', marketParams.baseAssetAddress);
        console.log('Quote asset:', marketParams.quoteAssetAddress);
        console.log('Price precision:', marketParams.pricePrecision.toString());
        console.log('Size precision:', marketParams.sizePrecision.toString());

        // Get current orderbook to determine best ask price
        const l2OrderBook = await KuruSdk.OrderBook.getL2OrderBook(provider, contractAddress, marketParams);
        const bestAskPrice = l2OrderBook.asks[0] ? l2OrderBook.asks[0][0] : 1.0;

        console.log(`\nCurrent best ask: $${bestAskPrice.toFixed(6)}`);

        // Calculate concentrated liquidity positions
        const batchDetails = await KuruSdk.PositionViewer.getSpotBatchLPDetails(
            BigInt(100), // 1% minimum fees (100 bps)
            ethers.parseUnits(startPrice.toString(), 18), // Start price
            ethers.parseUnits(endPrice.toString(), 18), // End price
            ethers.parseUnits(bestAskPrice.toString(), 18), // Best ask price
            marketParams.pricePrecision,
            marketParams.sizePrecision,
            marketParams.quoteAssetDecimals,
            marketParams.baseAssetDecimals,
            marketParams.tickSize,
            marketParams.minSize,
            ethers.parseUnits(quoteLiquidity.toString(), Number(marketParams.quoteAssetDecimals)), // Quote liquidity
        );

        console.log('\n=== Calculated Liquidity Positions ===');
        console.log(
            `Total quote liquidity: ${ethers.formatUnits(batchDetails.quoteLiquidity, Number(marketParams.quoteAssetDecimals))}`,
        );
        console.log(
            `Total base liquidity: ${ethers.formatUnits(batchDetails.baseLiquidity, Number(marketParams.baseAssetDecimals))}`,
        );

        console.log(`\nBid positions (${batchDetails.bids.length}):`);
        batchDetails.bids.slice(0, 5).forEach((bid, index) => {
            const price = ethers.formatUnits(bid.price, Number(marketParams.pricePrecision));
            const size = ethers.formatUnits(bid.liquidity, Number(marketParams.sizePrecision));
            console.log(`  ${index + 1}. Size: ${parseFloat(size).toFixed(4)} @ $${parseFloat(price).toFixed(6)}`);
        });

        console.log(`\nAsk positions (${batchDetails.asks.length}):`);
        batchDetails.asks.slice(0, 5).forEach((ask, index) => {
            const price = ethers.formatUnits(ask.price, Number(marketParams.pricePrecision));
            const size = ethers.formatUnits(ask.liquidity, Number(marketParams.sizePrecision));
            console.log(`  ${index + 1}. Size: ${parseFloat(size).toFixed(4)} @ $${parseFloat(price).toFixed(6)}`);
        });

        // Example: Place the first few positions
        console.log('\n=== Placing Sample Positions ===');

        // Place first bid
        if (batchDetails.bids.length > 0) {
            const firstBid = batchDetails.bids[0];
            const bidPrice = ethers.formatUnits(firstBid.price, Number(marketParams.pricePrecision));
            const bidSize = ethers.formatUnits(firstBid.liquidity, Number(marketParams.sizePrecision));

            try {
                const bidReceipt = await KuruSdk.GTC.placeLimit(signer, contractAddress, marketParams, {
                    price: bidPrice,
                    size: bidSize,
                    isBuy: true,
                    postOnly: true,
                    txOptions: {
                        priorityFee: 0.001,
                        gasPrice: ethers.parseUnits('1', 'gwei'),
                        gasLimit: 300000n,
                    },
                });

                console.log(
                    `Bid placed: ${parseFloat(bidSize).toFixed(4)} @ $${parseFloat(bidPrice).toFixed(6)} - Hash: ${bidReceipt.hash}`,
                );
            } catch (error) {
                console.error('Error placing bid:', error);
            }
        }

        // Place first ask
        if (batchDetails.asks.length > 0) {
            const firstAsk = batchDetails.asks[0];
            const askPrice = ethers.formatUnits(firstAsk.price, Number(marketParams.pricePrecision));
            const askSize = ethers.formatUnits(firstAsk.liquidity, Number(marketParams.sizePrecision));

            try {
                const askReceipt = await KuruSdk.GTC.placeLimit(signer, contractAddress, marketParams, {
                    price: askPrice,
                    size: askSize,
                    isBuy: false,
                    postOnly: true,
                    txOptions: {
                        priorityFee: 0.001,
                        gasPrice: ethers.parseUnits('1', 'gwei'),
                        gasLimit: 300000n,
                    },
                });

                console.log(
                    `Ask placed: ${parseFloat(askSize).toFixed(4)} @ $${parseFloat(askPrice).toFixed(6)} - Hash: ${askReceipt.hash}`,
                );
            } catch (error) {
                console.error('Error placing ask:', error);
            }
        }

        console.log('\nSpot concentrated liquidity example completed!');
    } catch (error) {
        console.error('Error in spot concentrated liquidity:', error);
    }
})();
