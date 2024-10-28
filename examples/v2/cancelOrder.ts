import { ethers, BigNumber } from "ethers";
import * as KuruSdk from "../../src";
import * as KuruConfig from "../config.json";

const {rpcUrl, contractAddress} = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

const args = process.argv.slice(2);

(async () => {
	const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    try {
        const txReceipt = await KuruSdk.OrderCanceler.cancelOrders(
            signer,
            contractAddress,
            args.map(arg => BigNumber.from(parseInt(arg)))
        );

        console.log("Transaction hash:", txReceipt.transactionHash);
    } catch (err: any) {
        console.error("Error:", err);
    }
})();
