import { ethers, BigNumber } from "ethers";
import * as KuruSdk from "../../src";
import * as KuruConfig from "../config.json";

const {rpcUrl, contractAddress} = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

const args = process.argv.slice(2);

(async () => {
	const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    provider._pollingInterval = 100;
    const signer = new ethers.Wallet(privateKey, provider);

    try {
        const txReceipt = await KuruSdk.OrderCanceler.cancelOrders(
            signer,
            contractAddress,
            args.map(arg => BigNumber.from(parseInt(arg))),
            {
                priorityFee: 0.001,
                // Cancels happen in constant gas so this can be used to improve performance
                gasLimit: BigNumber.from(80000 + (args.length - 1) * 20000),
                gasPrice: ethers.utils.parseUnits('1', 'gwei')
            }
        );

        console.log("Transaction hash:", txReceipt.transactionHash);
    } catch (err: any) {
        console.error("Error:", err);
    }
})();
