import { ethers } from "ethers";

import * as KuruSdk from "../../src";
import * as KuruConfig from "./../config.json";
import { PoolFetcher } from "../../src/pools/fetcher";

const { rpcUrl } = KuruConfig;

const kuruApi = process.env.KURU_API as string;

const args = process.argv.slice(2);
const amount = parseFloat(args[0]);

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    try {
        const bestPath = await KuruSdk.PathFinder.findBestPath(
            provider,
            "0x0000000000000000000000000000000000000000",
            "0x6563dEC3cFd98c665B001f03975D510E6B20C309",
            amount,
            "amountIn",
            new PoolFetcher(kuruApi)
        );

        console.log(bestPath);
        console.log(bestPath.route.path);
        console.log(bestPath.output);
    } catch (error) {
        console.error("Error finding best path:", error);
    }
})();
