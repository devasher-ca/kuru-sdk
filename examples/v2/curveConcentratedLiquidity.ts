import { ethers } from 'ethers';

import * as KuruSdk from '../../src';
import * as KuruConfig from '../config.json';

const { rpcUrl, contractAddress } = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

const args = process.argv.slice(2);
const startPrice = parseFloat(args[0]) || 0.9;
const endPrice = parseFloat(args[1]) || 1.1;
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
        console.log('Starting curve concentrated liquidity example...');
        console.log(`Price range: $${startPrice} - $${endPrice}`);
        console.log(`Quote liquidity: ${quoteLiquidity}`);

        // Get market parameters
        const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, contractAddress);

        console.log('\nMarket parameters:');
        console.log('Base asset:', marketParams.baseAssetAddress);
        console.log('Quote asset:', marketParams.quoteAssetAddress);

        // Get current orderbook to determine best ask price
        const l2OrderBook = await KuruSdk.OrderBook.getL2OrderBook(provider, contractAddress, marketParams);
        const bestAskPrice = l2OrderBook.asks[0] ? l2OrderBook.asks[0][0] : 1.0;

        console.log(`\nCurrent best ask: $${bestAskPrice.toFixed(6)}`);

        // Calculate curve concentrated liquidity positions (U-shape distribution)
        const batchDetails = await KuruSdk.PositionViewer.getCurveBatchLPDetails(
            BigInt(100), // 1% minimum fees (100 bps)
            ethers.parseUnits(startPrice.toString(), 18), // Start price
            ethers.parseUnits(endPrice.toString(), 18), // End price
            ethers.parseUnits(bestAskPrice.toString(), 18), // Best ask price (center of curve)
            marketParams.pricePrecision,
            marketParams.sizePrecision,
            marketParams.quoteAssetDecimals,
            marketParams.baseAssetDecimals,
            marketParams.tickSize,
            marketParams.minSize,
            ethers.parseUnits(quoteLiquidity.toString(), Number(marketParams.quoteAssetDecimals)), // Quote liquidity
        );

        console.log('\n=== Calculated Curve Liquidity Positions ===');
        console.log(
            `Total quote liquidity: ${ethers.formatUnits(batchDetails.quoteLiquidity, Number(marketParams.quoteAssetDecimals))}`,
        );
        console.log(
            `Total base liquidity: ${ethers.formatUnits(batchDetails.baseLiquidity, Number(marketParams.baseAssetDecimals))}`,
        );

        console.log(`\nBid positions (${batchDetails.bids.length}) - Highest liquidity near center:`);
        batchDetails.bids.slice(0, 5).forEach((bid, index) => {
            const price = ethers.formatUnits(bid.price, Number(marketParams.pricePrecision));
            const size = ethers.formatUnits(bid.liquidity, Number(marketParams.sizePrecision));
            console.log(`  ${index + 1}. Size: ${parseFloat(size).toFixed(4)} @ $${parseFloat(price).toFixed(6)}`);
        });

        console.log(`\nAsk positions (${batchDetails.asks.length}) - Highest liquidity near center:`);
        batchDetails.asks.slice(0, 5).forEach((ask, index) => {
            const price = ethers.formatUnits(ask.price, Number(marketParams.pricePrecision));
            const size = ethers.formatUnits(ask.liquidity, Number(marketParams.sizePrecision));
            console.log(`  ${index + 1}. Size: ${parseFloat(size).toFixed(4)} @ $${parseFloat(price).toFixed(6)}`);
        });

        // Example: Place the positions with highest liquidity (closest to center)
        console.log('\n=== Placing High-Liquidity Positions ===');

        // Place the highest liquidity bid (closest to center)
        if (batchDetails.bids.length > 0) {
            const highestBid = batchDetails.bids[batchDetails.bids.length - 1]; // Last bid is closest to center
            const bidPrice = ethers.formatUnits(highestBid.price, Number(marketParams.pricePrecision));
            const bidSize = ethers.formatUnits(highestBid.liquidity, Number(marketParams.sizePrecision));

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
                    `High-liquidity bid: ${parseFloat(bidSize).toFixed(4)} @ $${parseFloat(bidPrice).toFixed(6)} - Hash: ${bidReceipt.hash}`,
                );
            } catch (error) {
                console.error('Error placing bid:', error);
            }
        }

        // Place the highest liquidity ask (closest to center)
        if (batchDetails.asks.length > 0) {
            const highestAsk = batchDetails.asks[0]; // First ask is closest to center
            const askPrice = ethers.formatUnits(highestAsk.price, Number(marketParams.pricePrecision));
            const askSize = ethers.formatUnits(highestAsk.liquidity, Number(marketParams.sizePrecision));

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
                    `High-liquidity ask: ${parseFloat(askSize).toFixed(4)} @ $${parseFloat(askPrice).toFixed(6)} - Hash: ${askReceipt.hash}`,
                );
            } catch (error) {
                console.error('Error placing ask:', error);
            }
        }

        console.log('\nCurve concentrated liquidity example completed!');
        console.log('Note: Curve distribution concentrates more liquidity near the current market price.');

        // Add graphs at the end
        console.log('\nAsk Positions Graph (Size * Price):');
        const askValues = batchDetails.asks.map((position) => {
            const size = parseFloat(
                ethers.utils.formatUnits(
                    position.liquidity.toString(),
                    KuruSdk.log10BigNumber(marketParams.sizePrecision),
                ),
            );
            const price = parseFloat(
                ethers.utils.formatUnits(
                    position.price.toString(),
                    KuruSdk.log10BigNumber(marketParams.pricePrecision),
                ),
            );
            return size * price;
        });
        console.log(createAsciiGraph(askValues));

        console.log('\nBid Positions Graph (Size/Price):');
        const bidValues = batchDetails.bids.map((position) => {
            const size = parseFloat(
                ethers.utils.formatUnits(
                    position.liquidity.toString(),
                    KuruSdk.log10BigNumber(marketParams.sizePrecision),
                ),
            );
            const price = parseFloat(
                ethers.utils.formatUnits(
                    position.price.toString(),
                    KuruSdk.log10BigNumber(marketParams.pricePrecision),
                ),
            );
            return size * price;
        });
        console.log(createAsciiGraph(bidValues));
    } catch (error) {
        console.error('Error in curve concentrated liquidity:', error);
    }
})();
