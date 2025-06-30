import { ethers } from 'ethers';

import { ParamCreator } from '../../src/create/market';
import * as KuruConfig from '../config.json';

const { rpcUrl } = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

const args = process.argv.slice(2);
const baseTokenAddress = args[0];
const quoteTokenAddress = args[1];
const initialPrice = parseFloat(args[2]);

(async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    try {
        const paramCreator = new ParamCreator();

        // Calculate market precisions based on current market data
        const precisions = paramCreator.calculatePrecisions(
            1, // Current quote price
            456789, // Current base amount
            10, // Maximum expected price
            0.01, // Minimum order size
            10, // Tick size in basis points (0.1%)
        );

        console.log('Creating market with precisions:', {
            pricePrecision: precisions.pricePrecision.toString(),
            sizePrecision: precisions.sizePrecision.toString(),
            tickSize: precisions.tickSize.toString(),
            minSize: precisions.minSize.toString(),
            maxSize: precisions.maxSize.toString(),
        });

        const marketAddress = await paramCreator.deployMarket(
            signer,
            '0x473d60358019406a3fdb222c3d20658145614175', // Router address
            1, // Market type
            baseTokenAddress,
            quoteTokenAddress,
            precisions.sizePrecision,
            precisions.pricePrecision,
            precisions.tickSize,
            precisions.minSize,
            precisions.maxSize,
            30, // Taker fee in basis points (0.3%)
            10, // Maker fee in basis points (0.1%)
            BigInt(100), // AMM spread in basis points (1%)
        );

        console.log('Market created successfully!');
        console.log('Market address:', marketAddress);
    } catch (error) {
        console.error('Error creating market:', error);
    }
})();
