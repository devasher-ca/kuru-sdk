import { ethers } from 'ethers';

import * as KuruSdk from '../../src';
import * as KuruConfig from '../config.json';

const { rpcUrl, contractAddress } = KuruConfig;

const args = process.argv.slice(2);
const amount = parseFloat(args[0]);

(async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, contractAddress);

    try {
        const estimate = await KuruSdk.CostEstimator.estimateMarketBuy(provider, contractAddress, marketParams, amount);

        console.log(estimate);
    } catch (error) {
        console.error('Error estimating market buy:', error);
    }
})();
