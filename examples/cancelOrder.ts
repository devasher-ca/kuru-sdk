import * as KuruSdk from "../src";
import * as KuruConfig from "./config.json";

const {userAddress, rpcUrl, contractAddress} = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

const args = process.argv.slice(2);

(async () => {
	const clientSdk = await KuruSdk.OrderbookClient.create(privateKey, rpcUrl, contractAddress);

	await clientSdk.cancelOrders(args.map(arg => parseInt(arg)));
})();
