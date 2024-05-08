import OrderbookClient from "../src/client/orderBookClient";

const userAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const privateKey =
	"0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const rpcUrl = "http://localhost:8545";
const contractAddress = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";

const args = process.argv.slice(2);

(async () => {
	const clientSdk = await OrderbookClient.create(privateKey, rpcUrl, contractAddress);

	await clientSdk.cancelOrders(args.map(arg => parseInt(arg)));
})();
