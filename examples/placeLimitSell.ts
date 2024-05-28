import * as KuruSdk from "../src";
import * as KuruConfig from "./config.json";

const {rpcUrl, contractAddress} = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

const args = process.argv.slice(2);
const price = parseFloat(args[0]);
const quantity = parseFloat(args[1]);

(async () => {
	const clientSdk = await KuruSdk.OrderbookClient.create(privateKey, rpcUrl, contractAddress);

	await clientSdk.addSellOrder(price, quantity, false);
})();
