import { ethers } from "ethers";

import * as KuruSdk from "../../src";
import * as KuruConfig from "./../config.json";

const {rpcUrl, routerAddres, baseTokenAddress, quoteTokenAddress} = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

const args = process.argv.slice(2);
const size = parseFloat(args[0]);

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log("Provider ready")

    const routeOutput = await KuruSdk.PathFinder.findBestPath(
        provider,
        baseTokenAddress,
        quoteTokenAddress,
        1000
    );

    console.log(routeOutput.route.path);

    await KuruSdk.TokenSwap.swap(
        signer,
        routerAddres,
        routeOutput,
        size,
        18,
        18,
        10,
        true,
        (txHash: string | null) => {
            console.log(`Transaction hash: ${txHash}`);
        }
    );
})();
