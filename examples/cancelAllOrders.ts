import * as KuruSdk from "../src";
import * as KuruConfig from "./config.json";

const {userAddress, rpcUrl, contractAddress} = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

(async () => {
	const clientSdk = await KuruSdk.OrderbookClient.create(privateKey, rpcUrl, contractAddress);

	await clientSdk.cancelAllOrders(userAddress);
})();
