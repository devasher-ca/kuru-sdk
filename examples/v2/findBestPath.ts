import { ethers } from "ethers";

import * as KuruSdk from "../../src";
import * as KuruConfig from "./../config.json";

const { rpcUrl } = KuruConfig;

const args = process.argv.slice(2);
const amount = parseFloat(args[0]);

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    const bestPath = await KuruSdk.PathFinder.findBestPath(
        provider,
        "0x0000000000000000000000000000000000000000",
        "0x42Ab8854D0B96De2162Bc162A24306476B3EA7E2",
        amount,
        "amountIn"
    );

    console.log(bestPath);

    console.log(bestPath.route.path);
    console.log(bestPath.output);
})();
