import { BigNumber, ethers } from 'ethers';
import * as KuruSdk from '../../src';
import * as KuruConfig from '../config.json';

const { rpcUrl, contractAddress } = KuruConfig;
const privateKey = process.env.PRIVATE_KEY as string;

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    provider._pollingInterval = 100;
    const signer = new ethers.Wallet(privateKey, provider);

    try {
        const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, contractAddress);

        // Example: Place 2 buy orders and 2 sell orders while canceling order IDs 1 and 2
        const batchUpdate = {
            limitOrders: [
                // Sell orders
                {
                    price: 1,
                    size: 1.0,
                    isBuy: false,
                    postOnly: true,
                },
                {
                    price: 1.001,
                    size: 1.0,
                    isBuy: false,
                    postOnly: true,
                },
                // Buy orders
                {
                    price: 0.996,
                    size: 1.0,
                    isBuy: true,
                    postOnly: true,
                },
                {
                    price: 0.995,
                    size: 1.0,
                    isBuy: true,
                    postOnly: true,
                },
            ],
            cancelOrders: [BigNumber.from(1)],
            postOnly: true,
            txOptions: {
                priorityFee: 0.001,
                nonce: await signer.getTransactionCount(),
                gasPrice: ethers.utils.parseUnits('1', 'gwei'),
                gasLimit: ethers.utils.parseUnits('1000000', 1),
            },
        };

        const receipt = await KuruSdk.OrderBatcher.batchUpdate(signer, contractAddress, marketParams, batchUpdate);

        console.log('Batch update successful!');
        console.log('Transaction hash:', receipt.transactionHash);
    } catch (error) {
        console.error('Error performing batch update:', error);
    }
})();
