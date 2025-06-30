import { ethers } from 'ethers';

import * as KuruSdk from '../../src';
import * as KuruConfig from '../config.json';

const { rpcUrl, marginAccountAddress } = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

const args = process.argv.slice(2);
const amount = parseFloat(args[0]);

(async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    try {
        const userAddress = await signer.getAddress();
        const receipt = await KuruSdk.MarginDeposit.deposit(
            signer,
            marginAccountAddress,
            userAddress,
            ethers.ZeroAddress,
            amount.toString(),
            18,
            false,
            {
                priorityFee: 0.001,
            },
        );

        console.log('Transaction hash:', receipt.hash);
    } catch (error) {
        console.error('Error depositing:', error);
    }
})();
