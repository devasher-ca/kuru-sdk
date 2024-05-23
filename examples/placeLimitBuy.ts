import * as KuruSdk from "../src";

const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const privateKey =
	"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const rpcUrl = "http://localhost:8545";
const contractAddress = "0xBffBa2d75440205dE93655eaa185c12D52d42D10";
const marginAccountAddress = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
const baseTokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const quoteTokenAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const args = process.argv.slice(2);
const price = parseFloat(args[0]);
const quantity = parseFloat(args[1]);

(async () => {
	const clientSdk = await KuruSdk.OrderbookClient.create(privateKey, rpcUrl, contractAddress);
	const marginAccountSdk = new KuruSdk.MarginAccountClient(
		privateKey,
		rpcUrl,
		marginAccountAddress,
	);

	// await marginAccountSdk.deposit(userAddress, quoteTokenAddress, 1000000, 18);
	await clientSdk.addBuyOrder(price, quantity, false);
})();
