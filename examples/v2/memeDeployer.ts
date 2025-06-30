import { ethers } from 'ethers';
import { MonadDeployer } from '../../src/create/monadDeployer';
import { ParamCreator } from '../../src/create/market';
import * as KuruConfig from '../config.json';

const { rpcUrl } = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

(async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    const monadDeployer = new MonadDeployer();
    const paramCreator = new ParamCreator();

    const tokenParams = {
        name: 'Test Token',
        symbol: 'TEST',
        tokenURI: 'https://cdn.prod.website-files.com/667c57e6f9254a4b6d914440/667d7104644c621965495f6e_LogoMark.svg',
        initialSupply: ethers.parseUnits('1000000', 18), // 1M tokens
        dev: await signer.getAddress(), // Developer address
        supplyToDev: 1000n, // 10% in basis points (bps)
    };

    // Calculate market parameters using ParamCreator
    const currentQuote = 1; // Current quote price
    const currentBase = 456789; // Current base amount
    const maxPrice = 10; // Maximum expected price
    const minSize = 0.01; // Minimum order size

    const precisions = paramCreator.calculatePrecisions(
        currentQuote,
        currentBase,
        maxPrice,
        minSize,
        10, // tickSizeBps
    );

    // Example market parameters using calculated precisions
    const marketParams = {
        nativeTokenAmount: ethers.parseEther('1'), // 1 ETH for initial liquidity
        sizePrecision: precisions.sizePrecision,
        pricePrecision: precisions.pricePrecision,
        tickSize: precisions.tickSize,
        minSize: precisions.minSize,
        maxSize: precisions.maxSize,
        takerFeeBps: 30, // 0.3%
        makerFeeBps: 10, // 0.1%
    };

    try {
        const result = await monadDeployer.deployTokenAndMarket(
            signer,
            '0x473d60358019406a3fdb222c3d20658145614175', // MonadDeployer address
            tokenParams,
            marketParams,
        );

        console.log('Token and market deployed successfully!');
        console.log('Token address:', result.tokenAddress);
        console.log('Market address:', result.marketAddress);
        console.log('Transaction hash:', result.transactionHash);
    } catch (error) {
        console.error('Error deploying token and market:', error);
    }
})();
