import RouterListener from '../src/listener/routerListener';

const rpcUrl = 'http://localhost:8545';
const contractAddress = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';

const dbConfig = {
    user: 'username',
    host: 'localhost', // or the database server's address
    database: 'orderbook',
    password: 'password',
    port: 5432,
};


const sdk = new RouterListener(rpcUrl, contractAddress, dbConfig);

// Start listening for events
sdk.initialize();
