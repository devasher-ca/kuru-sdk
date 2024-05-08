import OrderbookClient from "../src/client/orderBookClient";
import MarginAccountClient from "../src/client/marginAccountClient";

const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const privateKey =
	"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const rpcUrl = "http://localhost:8545";
const contractAddress = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
const marginAccountAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
const baseTokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const quoteTokenAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const args = process.argv.slice(2);
const price = parseFloat(args[0]);
const quantity = parseFloat(args[1]);

(async () => {
	const clientSdk = await OrderbookClient.create(privateKey, rpcUrl, contractAddress);
	const marginAccountSdk = new MarginAccountClient(
		privateKey,
		rpcUrl,
		marginAccountAddress,
	);

	await marginAccountSdk.deposit(userAddress, quoteTokenAddress, 1000000, 18);
	await clientSdk.addBuyOrder(BigInt(price), BigInt(quantity));
})();
