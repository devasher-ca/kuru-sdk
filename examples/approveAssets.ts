import * as KuruSdk from "../src";
import * as KuruConfig from "./config.json";

const {userAddress, rpcUrl, marginAccountAddress, baseTokenAddress, quoteTokenAddress} = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

(async () => {
	const marginAccountSdk = new KuruSdk.MarginAccountClient(
		privateKey,
		rpcUrl,
		marginAccountAddress,
	);

	console.log(await marginAccountSdk.deposit(userAddress, baseTokenAddress, 1000000, 18));
    console.log(await marginAccountSdk.deposit(userAddress, quoteTokenAddress, 1000000, 18));
})();
