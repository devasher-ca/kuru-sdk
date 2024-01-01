import fs from 'fs';

import OrderbookService from '../src/orderbookService';
import { Order } from '../src/orderbookService';

const mapToObject = (map: Map<number, Order[]>) => {
    const obj: { [key: string]: Order[] } = {};
    for (let [key, value] of map) {
        obj[key] = value;
    }
    return obj;
};

const dbConfig = {
    user: 'username',
    host: 'localhost', // or the database server's address
    database: 'orderbook',
    password: 'password',
    port: 5432,
};

const sdkService = new OrderbookService(dbConfig);

// Example usage
(async () => {
    const L3Orderbook = await sdkService.getL3OrderBook();

    fs.writeFileSync('./tmp/L3Orderbook.json', JSON.stringify({
        buyOrders: mapToObject(L3Orderbook.buyOrders),
        sellOrders: mapToObject(L3Orderbook.sellOrders),
    }));

    const L2Orderbook = await sdkService.getL2OrderBook();

    fs.writeFileSync('./tmp/L2Orderbook.json', JSON.stringify({L2Orderbook}));
})();
