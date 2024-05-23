import * as KuruSdk from "../src";

const userAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const privateKey =
	"0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
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

	// await marginAccountSdk.deposit(userAddress, baseTokenAddress, 1000000, 18);
	await clientSdk.addSellOrder(price, quantity, false);
})();
