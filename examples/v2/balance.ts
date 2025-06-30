import { ethers } from 'ethers';

import * as KuruSdk from '../../src';
import * as KuruConfig from '../config.json';

const { rpcUrl, marginAccountAddress } = KuruConfig;

(async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    try {
        const balance = await KuruSdk.MarginBalance.getBalance(
            provider,
            marginAccountAddress,
            '0x18B908f74d83257407487463dbc11d4223017187',
            ethers.ZeroAddress,
        );
        console.log('Balance:', ethers.formatUnits(balance, 18));
    } catch (error: any) {
        console.error('Error fetching balance:', error);
    }
})();
