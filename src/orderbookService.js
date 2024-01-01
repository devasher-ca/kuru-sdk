"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const pg_1 = require("pg");
class OrderBookService {
    constructor(privateKey, rpcUrl, contractAddress, contractABI, dbConfig) {
        const provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
        this.contract = new ethers_1.ethers.Contract(contractAddress, contractABI, wallet);
        this.db = new pg_1.Pool(dbConfig);
    }
    getOrders() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const res = yield this.db.query(`SELECT * FROM orderbook`);
                return res.rows;
            }
            catch (error) {
                console.error(`Error fetching data from orders:`, error);
                throw error;
            }
        });
    }
    getL3OrderBook() {
        return __awaiter(this, void 0, void 0, function* () {
            const orders = yield this.getOrders();
            const orderBook = {
                buyOrders: new Map(),
                sellOrders: new Map()
            };
            const addOrder = (order, orderMap) => {
                var _a;
                if (!orderMap.has(order.price)) {
                    orderMap.set(order.price, []);
                }
                (_a = orderMap.get(order.price)) === null || _a === void 0 ? void 0 : _a.push(order);
            };
            const sortOrdersByRange = (ordersList) => {
                ordersList.sort((a, b) => a.acceptable_range - b.acceptable_range);
            };
            orders.forEach(order => {
                const targetMap = order.is_buy ? orderBook.buyOrders : orderBook.sellOrders;
                addOrder(order, targetMap);
            });
            orderBook.buyOrders.forEach(sortOrdersByRange);
            orderBook.sellOrders.forEach(sortOrdersByRange);
            return {
                buyOrders: Array.from(orderBook.buyOrders),
                sellOrders: Array.from(orderBook.sellOrders)
            };
        });
    }
    getL2OrderBook() {
        return __awaiter(this, void 0, void 0, function* () {
            const orders = yield this.getOrders();
            const buys = new Map();
            const sells = new Map();
            orders.forEach(order => {
                const orderMap = order.is_buy ? buys : sells;
                const currentSize = orderMap.get(order.price) || 0;
                // Ensure numerical addition
                orderMap.set(order.price, currentSize + Number(order.size));
            });
            // Function to sort map entries by price in descending order
            const sortMapDescending = (map) => {
                return Array.from(map).sort((a, b) => b[0] - a[0]);
            };
            return {
                buyOrders: sortMapDescending(buys),
                sellOrders: sortMapDescending(sells),
            };
        });
    }
}
exports.default = OrderBookService;
