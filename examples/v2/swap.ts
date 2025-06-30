import { ethers } from 'ethers';

import * as KuruSdk from '../../src';
import * as KuruConfig from '../config.json';

const { rpcUrl } = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

const args = process.argv.slice(2);
const tokenInAddress = args[0];
const tokenOutAddress = args[1];
const amountIn = parseFloat(args[2]);

(async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    try {
        const routeData = await KuruSdk.PathFinder.findBestPath(
            provider,
            tokenInAddress,
            tokenOutAddress,
            amountIn,
            'amountIn',
        );

        console.log('Best route found:', routeData);

        const receipt = await KuruSdk.TokenSwap.swap(
            signer,
            '0x473d60358019406a3fdb222c3d20658145614175', // Router address
            routeData,
            amountIn,
            18,
            18,
            5,
            true,
            (txHash: string | null) => {
                console.log(`Approval transaction hash: ${txHash}`);
            },
        );

        console.log('Transaction hash:', receipt.hash);
    } catch (error) {
        console.error('Error swapping tokens:', error);
    }
})();
