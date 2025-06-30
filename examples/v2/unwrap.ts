import { ethers } from 'ethers';

import * as KuruSdk from '../../src';
import * as KuruConfig from '../config.json';

const { rpcUrl } = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

const args = process.argv.slice(2);
const amount = parseFloat(args[0]);

(async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    try {
        const receipt = await KuruSdk.WrapperUtils.unwrap(
            signer,
            '0x6C15057930e0d8724886C09e940c5819fBE65465', // WMON address
            amount.toString(),
            18,
            {
                priorityFee: 0.001,
                gasPrice: ethers.parseUnits('1', 'gwei'),
                gasLimit: 100000n,
            },
        );

        console.log('Transaction hash:', receipt.hash);
    } catch (error) {
        console.error('Error unwrapping:', error);
    }
})();
