import { ethers } from "ethers";

import * as KuruSdk from "../../src";
import * as KuruConfig from "./../config.json";
import { PoolFetcher } from "../../src/pools/fetcher";
const { rpcUrl, estimatorContractAddress } = KuruConfig;

const kuruApi = process.env.KURU_API;

const args = process.argv.slice(2);
const amount = parseFloat(args[0]);

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    try {
        const pool = new PoolFetcher(kuruApi as string);
        const result = await pool.getAllPools(
            "0x0000000000000000000000000000000000000000",
            "0x6C15057930e0d8724886C09e940c5819fBE65465",
            [
                {
                    symbol: "MON",
                    address: "0x0000000000000000000000000000000000000000",
                },
                {
                    symbol: "USDC",
                    address: "0x6C15057930e0d8724886C09e940c5819fBE65465",
                },
            ]
        );
        console.log("result", result);
        const bestPath = await KuruSdk.PathFinder.findBestPath(
            provider,
            "0x0000000000000000000000000000000000000000",
            "0x6C15057930e0d8724886C09e940c5819fBE65465",
            amount,
            "amountIn",
            undefined,
            result,
            estimatorContractAddress
        );

        console.log("priceImpact: ", bestPath.priceImpact)
    } catch (error) {
        console.error("Error finding best path:", error);
    }
})();
