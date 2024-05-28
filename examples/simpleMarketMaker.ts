import * as KuruSdk from "../src";
import * as KuruConfig from "./config.json";

export async function simpleMarketMaker(privateKeyPath: string) {
	const {userAddress, rpcUrl, contractAddress} = KuruConfig;

	const privateKey = process.env.PRIVATE_KEY as string;


	// Frequency in milliseconds to update quotes
	const QUOTE_REFRESH_FREQUENCY = 10000;
	// Edge in cents on quote. Places bid/ask at fair price -/+ edge
	const QUOTE_EDGE = 0.01;

	// Create a Kuru Client
	const clientSdk = await KuruSdk.OrderbookClient.create(privateKey, rpcUrl, contractAddress);
	// Track place transaction iterations
	let count = 0;

	/* eslint-disable no-constant-condition */
	while (true) {
		// Before quoting, we cancel all outstanding orders
		await clientSdk.cancelAllOrders(userAddress);

		// Get the price from a price source, here from Coinbase
		const price = await fetch("https://api.coinbase.com/v2/prices/SOL-USD/spot")
			.then((response) => response.json())
			.then((data) => {
				return data.data.amount;
			})
			.catch((error) => console.error(error));
		console.log("price", price);
		const bidPrice = Math.round(parseFloat(price) * 100) / 100 - QUOTE_EDGE;
		const askPrice = Math.round(parseFloat(price) * 100) / 100 + QUOTE_EDGE;

        console.log(`Bid Price: ${bidPrice} \nAskPrice ${askPrice}`)

		await clientSdk.addBuyOrder(bidPrice, 1, false);

        await clientSdk.addSellOrder(askPrice, 1, false);

		// Sleep for QUOTE_REFRESH_FREQUENCY milliseconds
		await new Promise((r) => setTimeout(r, QUOTE_REFRESH_FREQUENCY));
	}
}

(async function () {
	try {
		await simpleMarketMaker(process.argv[2]);
	} catch (err) {
		console.log("Error: ", err);
		process.exit(1);
	}

	process.exit(0);
})();
