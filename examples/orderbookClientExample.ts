import OrderbookClient from "../src/orderbookClient";
import orderBookAbi from "../abi/CranklessOrderBook.json";
import erc20Abi from "../abi/IERC20.json";
import OrderBookService from "../src/orderbookService";

const privateKey =
	"";
const rpcUrl = "http://localhost:8545";
const contractAddress = "0xa67eD9FFcAE32A1B6c63D8A5E469446FAa8a8704";
const baseTokenAddress = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";
const quoteTokenAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

const dbConfig = {
	user: "username",
	host: "localhost", // or the database server's address
	database: "orderbook",
	password: "password",
	port: 5432,
};

const sdk = new OrderbookClient(
	new OrderBookService(dbConfig),
	privateKey,
	rpcUrl,
	contractAddress,
	orderBookAbi.abi,
	baseTokenAddress,
	quoteTokenAddress,
	erc20Abi.abi
);

// Example usage
(async () => {
	// await sdk.addBuyOrder(100, 1000);
	// await sdk.addSellOrder(200, 500);
	// await sdk.placeMultipleBuyOrders([100, 150], [1000, 1500]);
	// await sdk.placeMultipleSellOrders([200, 250], [500, 750]);
	// await sdk.cancelOrders([3, 4], [true, false]);
	// await sdk.replaceOrders([5, 6], [110, 260]);
	await sdk.estimateGasForLimitOrder(180000, 2 * 10 ** 10, true);
})();
