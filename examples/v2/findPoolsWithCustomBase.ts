import { ethers } from 'ethers';

import * as KuruSdk from '../../src';
import * as KuruConfig from '../config.json';
import { PoolFetcher } from '../../src/pools/fetcher';

const { rpcUrl } = KuruConfig;

const kuruApi = process.env.KURU_API;

(async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    try {
        const pool = new PoolFetcher(kuruApi as string);
        const result = await pool.getPoolsWithCustomBase(
            '0x0000000000000000000000000000000000000000',
            '0x6C15057930e0d8724886C09e940c5819fBE65465',
            [
                {
                    symbol: 'MON',
                    address: '0x0000000000000000000000000000000000000000',
                },
                {
                    symbol: 'USDC',
                    address: '0x6C15057930e0d8724886C09e940c5819fBE65465',
                },
            ],
        );

        console.log('Pools with custom base tokens:', result);
    } catch (error) {
        console.error('Error finding pools with custom base:', error);
    }
})();
