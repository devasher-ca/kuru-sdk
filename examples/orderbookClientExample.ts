import * as KuruSdk from "../src";

const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const privateKey =
	"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const rpcUrl = "http://localhost:8545";
const contractAddress = "0xE9426DA3c9D65e52a28652eb24461d5561F12949";
const marginAccountAddress = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
const quoteTokenAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

// Example usage
(async () => {
	const clientSdk = await KuruSdk.OrderbookClient.create(privateKey, rpcUrl, contractAddress);
	const marginAccountSdk = new KuruSdk.MarginAccountClient(
		privateKey,
		rpcUrl,
		marginAccountAddress,
	);

	await marginAccountSdk.deposit(userAddress, quoteTokenAddress, 100, 18);
	await clientSdk.addBuyOrder(1300, 2);
	await clientSdk.addSellOrder(200, 500);
	await clientSdk.placeMultipleBuyOrders([100, 150], [1000, 1500]);
	await clientSdk.placeMultipleSellOrders([200, 250], [500, 750]);
	await clientSdk.cancelOrders([3, 4]);
	console.log(await clientSdk.estimateGasForLimitOrder(1800, 2, true));
})();
