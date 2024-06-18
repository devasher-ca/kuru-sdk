import { BigNumber } from "ethers";
import * as KuruSdk from "../src";
import * as KuruConfig from "./config.json";

const {userAddress, rpcUrl, contractAddress, marginAccountAddress, baseTokenAddress, quoteTokenAddress} = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

// Example usage
(async () => {
	const clientSdk = await KuruSdk.OrderbookClient.create(privateKey, rpcUrl, contractAddress);
	const marginAccountSdk = new KuruSdk.MarginAccountClient(
		privateKey,
		rpcUrl,
		marginAccountAddress,
	);

	await marginAccountSdk.deposit(userAddress, quoteTokenAddress, 100, 18);
	await clientSdk.addBuyOrder(1300, 2, false);
	await clientSdk.addSellOrder(200, 500, false);
	await clientSdk.placeMultipleBuyOrders([100, 150], [1000, 1500], false);
	await clientSdk.placeMultipleSellOrders([200, 250], [500, 750], false);
	await clientSdk.cancelOrders([BigNumber.from(3), BigNumber.from(4)]);
	console.log(await clientSdk.estimateGasForLimitOrder(1800, 2, true));
})();
