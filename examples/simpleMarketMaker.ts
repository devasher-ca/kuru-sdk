import * as KuruSdk from "../src";

export async function simpleMarketMaker(privateKeyPath: string) {
	const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const rpcUrl = "http://localhost:8545";
    const contractAddress = "0xE9426DA3c9D65e52a28652eb24461d5561F12949";

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

		await clientSdk.addBuyOrder(bidPrice, 1);

        await clientSdk.addSellOrder(askPrice, 1);

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
