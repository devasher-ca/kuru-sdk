import { ethers } from "ethers";

import * as KuruSdk from "../../src";
import * as KuruConfig from "./../config.json";

const {rpcUrl, contractAddress} = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

const args = process.argv.slice(2);
const price = parseFloat(args[0]);
const size = parseFloat(args[1]);

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    provider._pollingInterval = 100;
    const signer = new ethers.Wallet(privateKey, provider);

    const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, contractAddress);

	try {
        const receipt = await KuruSdk.GTC.placeLimit(
            signer,
            contractAddress,
            marketParams,
            {
                price,
                size,
                isBuy: false,
                postOnly: true
            },
            {
                priorityFee: 0.001,
                // gasLimit: ethers.utils.parseUnits('1000000', 1),
                gasPrice: ethers.utils.parseUnits('1', 'gwei')
            }
        );
        console.log("Transaction hash:", receipt.transactionHash);
    } catch(e) {
        console.error("Error placing limit sell order:", e);
    }
})();
