import OrderStorageService from '../src/OrderStorageService';
import contractABI from '../abi/CranklessOrderBook.json';

const rpcUrl = 'http://localhost:8545';
const contractAddress = '0xa67eD9FFcAE32A1B6c63D8A5E469446FAa8a8704';

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
