import MarketListener from '../src/listener/marketsListener';
import contractABI from '../abi/CranklessOrderBook.json';

const rpcUrl = 'http://localhost:8545';
const contractAddress = '0xc7D19947980db56C0a023D0d0DeED5E9353EF741';

const dbConfig = {
    user: 'username',
    host: 'localhost', // or the database server's address
    database: 'orderbook',
    password: 'password',
    port: 5432,
};


const sdk = new MarketListener(rpcUrl, contractAddress, contractABI.abi, dbConfig);

// Start listening for events
sdk.listenForOrderEvents();
