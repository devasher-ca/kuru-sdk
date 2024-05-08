import * as KuruSdk from "../src";

const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const privateKey =
	"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const rpcUrl = "http://localhost:8545";
const contractAddress = "0xE9426DA3c9D65e52a28652eb24461d5561F12949";

(async () => {
	const clientSdk = await KuruSdk.OrderbookClient.create(privateKey, rpcUrl, contractAddress);

	await clientSdk.cancelAllOrders(userAddress);
})();
