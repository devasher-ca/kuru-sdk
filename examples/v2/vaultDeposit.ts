import { ethers } from 'ethers';

import * as KuruSdk from '../../src';
import * as KuruConfig from '../config.json';

const { rpcUrl } = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

const args = process.argv.slice(2);
const amount1 = parseFloat(args[0]);
const amount2 = parseFloat(args[1]);
const vaultAddress = args[2];
const baseAssetAddress = args[3];
const quoteAssetAddress = args[4];

(async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    try {
        const receipt = await KuruSdk.Vault.depositWithAmounts(
            ethers.parseUnits(amount1.toString(), 18),
            ethers.parseUnits(amount2.toString(), 6),
            baseAssetAddress,
            quoteAssetAddress,
            vaultAddress,
            signer,
            true, // Approve tokens
        );

        console.log('Vault deposit successful!');
        console.log('Transaction hash:', receipt.hash);
    } catch (error) {
        console.error('Error depositing to vault:', error);
    }
})();
