import OrderbookService from '../src/orderbookService';
import contractAbi from '../abi/CranklessOrderBook.json';

const privateKey = 'f94f2358316ae919ed24243bcf55fd3638539676d30acab3d1b25b7717b5ae38';
const rpcUrl = 'http://localhost:8545';
const contractAddress = '0x5771c832D78fDf76A3DA918E4B7a49c062910639';

const sdkService = new OrderbookService(privateKey, rpcUrl, contractAddress, contractAbi.abi);

// Example usage
(async () => {
    const buyPricePoints = await sdkService.getBuyPricePoints();
    console.log(buyPricePoints);
})();
