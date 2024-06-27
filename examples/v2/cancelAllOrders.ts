import { ethers } from "ethers";

import * as KuruSdk from "../../src";
import * as KuruConfig from "../config.json";

const {userAddress, rpcUrl, contractAddress} = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

(async () => {
	const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

	const canceledOrders = await KuruSdk.OrderCanceler.cancelAllOrders(
		signer,
		contractAddress,
		userAddress
	);

	console.log(canceledOrders);
})();
