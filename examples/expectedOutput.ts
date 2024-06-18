import * as KuruSdk from "../src";
import * as KuruConfig from "./config.json";

const {rpcUrl, contractAddress} = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

const args = process.argv.slice(2);
const size = parseFloat(args[0]);
const isBuy = args[1];

(async () => {
	const clientSdk = await KuruSdk.OrderbookClient.create(privateKey, rpcUrl, contractAddress);

    console.log(await clientSdk.estimateMarketBuy(size));
})();
