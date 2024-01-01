import OrderStorageService from '../src/OrderStorageService';
import contractABI from '../abi/CranklessOrderBook.json';

const rpcUrl = 'http://localhost:8545';
const contractAddress = '0x5771c832D78fDf76A3DA918E4B7a49c062910639';

const dbConfig = {
    user: 'username',
    host: 'localhost', // or the database server's address
    database: 'orderbook',
    password: 'password',
    port: 5432,
};


const sdk = new OrderStorageService(rpcUrl, contractAddress, contractABI.abi, dbConfig);

// Start listening for events
sdk.listenForOrderEvents();
