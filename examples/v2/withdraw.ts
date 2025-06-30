import { ethers } from 'ethers';

import * as KuruSdk from '../../src';
import * as KuruConfig from '../config.json';

const { rpcUrl, marginAccountAddress } = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

(async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    try {
        const receipt = await KuruSdk.MarginWithdraw.batchClaimMaxTokens(signer, marginAccountAddress, [
            ethers.ZeroAddress,
        ]);

        console.log('Transaction hash:', receipt.hash);
    } catch (error) {
        console.error('Error withdrawing:', error);
    }
})();
