import { ethers } from "ethers";

import * as KuruSdk from "../../src";
import * as KuruConfig from "./../config.json";

const {rpcUrl, baseTokenAddress, quoteTokenAddress} = KuruConfig;

const args = process.argv.slice(2);
const amount = parseFloat(args[0]);

console.log("Finding best path...");

(async () => {
    console.log({
        rpcUrl,
        baseTokenAddress,
        quoteTokenAddress,
        amount
    })
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    const bestPath = await KuruSdk.PathFinder.findBestPath(
        provider,
        "0x8a19cD50678340Bd28c39854571bE05EE6422b62",
        "0xF1f398E10Fe3D8D8b5158bb2882bDAeEE706F395",
        1000
    );

    console.log(bestPath.route.path);
    console.log(bestPath.output);
})();
