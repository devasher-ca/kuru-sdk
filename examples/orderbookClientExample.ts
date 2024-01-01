import OrderbookClient from '../src/orderbookClient';
import abi from '../abi/CranklessOrderBook.json';

const privateKey = 'YOUR_PRIVATE_KEY';
const rpcUrl = 'YOUR_RPC_URL';
const contractAddress = 'YOUR_CONTRACT_ADDRESS';

const sdk = new OrderbookClient(privateKey, rpcUrl, contractAddress, abi);

// Example usage
(async () => {
    await sdk.addBuyOrder(100, 1000);
    await sdk.addSellOrder(200, 500);
    await sdk.cancelSellOrder(1);
    await sdk.cancelBuyOrder(2);
    await sdk.placeMultipleBuyOrders([100, 150], [1000, 1500]);
    await sdk.placeMultipleSellOrders([200, 250], [500, 750]);
    await sdk.batchCancelOrders([3, 4], [true, false]);
    await sdk.replaceOrders([5, 6], [110, 260]);
})();
