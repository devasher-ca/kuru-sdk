import { ethers } from 'ethers';

import * as KuruSdk from '../../src';
import * as KuruConfig from '../config.json';

const { rpcUrl, marginAccountAddress, baseTokenAddress } = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    try {
        const receipt = await KuruSdk.MarginWithdraw.batchClaimMaxTokens(signer, marginAccountAddress, [
            baseTokenAddress,
        ]);
        console.log('Transaction hash:', receipt.transactionHash);
    } catch (error: any) {
        console.error('Error withdrawing:', error);
    }
})();
