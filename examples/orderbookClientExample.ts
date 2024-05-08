import OrderbookClient from "../src/client/orderBookClient";
import MarginAccountClient from "../src/client/marginAccountClient"

const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const privateKey =
	"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const rpcUrl = "http://localhost:8545";
const contractAddress = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
const marginAccountAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
const quoteTokenAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

// Example usage
(async () => {
	const clientSdk = await OrderbookClient.create(privateKey, rpcUrl, contractAddress);
	const marginAccountSdk = new MarginAccountClient(
		privateKey,
		rpcUrl,
		marginAccountAddress,
	);

	await marginAccountSdk.deposit(userAddress, quoteTokenAddress, 100, 18);
	await clientSdk.addBuyOrder(BigInt(1300), BigInt(2));
	await clientSdk.addSellOrder(BigInt(200), BigInt(500));
	await clientSdk.placeMultipleBuyOrders([BigInt(100), BigInt(150)], [BigInt(1000), BigInt(1500)]);
	await clientSdk.placeMultipleSellOrders([BigInt(200), BigInt(250)], [BigInt(500), BigInt(750)]);
	await clientSdk.cancelOrders([3, 4]);
	console.log(await clientSdk.estimateGasForLimitOrder(BigInt(1800), BigInt(2), true));
})();
