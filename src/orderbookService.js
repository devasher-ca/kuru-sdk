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
const pg_1 = require("pg");
class OrderBookService {
    constructor(dbConfig) {
        this.db = new pg_1.Pool(dbConfig);
    }
    /**
     * Fetches all orders from the orderbook.
     * @returns {Promise<Order[]>} A promise that resolves to an array of Order objects.
     */
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
    /**
     * Fetches all buy orders from the orderbook.
     * @returns {Promise<Order[]>} A promise that resolves to an array of buy Order objects.
     */
    getBuyOrders() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const res = yield this.db.query(`SELECT * FROM orderbook WHERE is_buy=true`);
                return res.rows;
            }
            catch (error) {
                console.error(`Error fetching data from orders:`, error);
                throw error;
            }
        });
    }
    /**
     * Fetches all sell orders from the orderbook.
     * @returns {Promise<Order[]>} A promise that resolves to an array of sell Order objects.
     */
    getSellOrders() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const res = yield this.db.query(`SELECT * FROM orderbook WHERE is_buy=false`);
                return res.rows;
            }
            catch (error) {
                console.error(`Error fetching data from orders:`, error);
                throw error;
            }
        });
    }
    /**
     * Fetches orders for a specific user.
     * @param {string} ownerAddress - The address of the order owner.
     * @returns {Promise<Order[]>} A promise that resolves to an array of Order objects owned by the specified user.
     */
    getOrderForUser(ownerAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const query = `SELECT * FROM orderbook WHERE owner_address = $1`;
                const res = yield this.db.query(query, [ownerAddress]);
                return res.rows;
            }
            catch (error) {
                console.error(`Error fetching data for user ${ownerAddress}:`, error);
                throw error;
            }
        });
    }
    /**
     * Fetches a specific order by its ID.
     * @param {number} orderId - The ID of the order to fetch.
     * @returns {Promise<Order | null>} A promise that resolves to the Order object if found, or null otherwise.
     */
    getOrder(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const query = `SELECT * FROM orderbook WHERE order_id = $1`;
                const res = yield this.db.query(query, [orderId]);
                if (res.rows.length === 0) {
                    return null;
                }
                return res.rows[0];
            }
            catch (error) {
                console.error(`Error fetching order with ID ${orderId}:`, error);
                throw error;
            }
        });
    }
    /**
     * Fetches the Level 3 order book, including detailed order information.
     * @returns {Promise<any>} A promise that resolves to the Level 3 order book.
     */
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
            // Sort buy and sell orders in descending order of price
            const sortMapDescendingByPrice = (map) => {
                return new Map([...map.entries()].sort((a, b) => b[0] - a[0]));
            };
            return {
                buyOrders: sortMapDescendingByPrice(orderBook.buyOrders),
                sellOrders: sortMapDescendingByPrice(orderBook.sellOrders)
            };
        });
    }
    /**
     * Fetches the Level 2 order book, including aggregated order sizes by price point.
     * @returns {Promise<any>} A promise that resolves to the Level 2 order book.
     */
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
    /**
     * Checks if an order is active.
     * @param {number} orderId - The ID of the order to check.
     * @returns {Promise<boolean>} A promise that resolves to true if the order is active, false otherwise.
     */
    isOrderActive(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const order = yield this.getOrder(orderId);
            return order != null;
        });
    }
    /**
     * Fetches a list of buy order IDs that meet a target size and buffer percent criteria.
     * This method is used for providing order ids against which a market order would want to execute.
     * @param {number} size - The target size of orders to accumulate.
     * @param {number} bufferPercent - The buffer percentage to apply to the target size.
     * @returns {Promise<number[]>} A promise that resolves to an array of buy order IDs.
     */
    getBuyOrdersForSize(size, bufferPercent) {
        return __awaiter(this, void 0, void 0, function* () {
            const orders = yield this.getBuyOrders(); // Fetch only buy orders
            const targetSize = size + (bufferPercent / 100) * size;
            let accumulatedSize = 0;
            let orderIds = [];
            // Sort buy orders by price (ascending), then by acceptable range (ascending)
            const sortedBuyOrders = orders.sort((a, b) => {
                return a.price === b.price ? a.acceptable_range - b.acceptable_range : b.price - a.price;
            });
            for (const order of sortedBuyOrders) {
                if (accumulatedSize >= targetSize)
                    break;
                accumulatedSize += Number(order.size);
                orderIds.push(order.order_id);
            }
            return orderIds;
        });
    }
    /**
     * Calculates the average buy price for a specified size.
     *
     * This function fetches all buy orders from the database. It then sorts these orders by price in ascending order.
     * In cases where multiple orders have the same price, they are sorted by their acceptable range in ascending order.
     * The function iterates over these sorted orders, summing up their sizes until it reaches or exceeds the specified 'size'.
     * Simultaneously, it accumulates the total price of these orders and counts the number of orders considered.
     * Finally, the function calculates the average price by dividing the total price by the number of orders.
     * This average price is representative of the average cost per unit for the given 'size'.
     *
     * @param {number} size - The total size for which the average buy price is calculated.
     * @returns {Promise<number>} - A promise that resolves to the average buy price for the specified size.
     */
    getAvgBuyPriceForSize(size) {
        return __awaiter(this, void 0, void 0, function* () {
            const orders = yield this.getBuyOrders(); // Fetch only buy orders
            // Sort buy orders by price (ascending), then by acceptable range (ascending)
            const sortedBuyOrders = orders.sort((a, b) => {
                return a.price === b.price ? a.acceptable_range - b.acceptable_range : b.price - a.price;
            });
            let accumulatedSize = 0;
            let totalPrice = 0;
            let totalOrders = 0;
            for (const order of sortedBuyOrders) {
                if (accumulatedSize >= size)
                    break;
                accumulatedSize += Number(order.size);
                totalPrice += order.price;
                totalOrders += 1;
            }
            return totalPrice / totalOrders;
        });
    }
    /**
    * Fetches a list of sell order IDs that meet a target size and buffer percent criteria.
    * This method is used for providing order ids against which a market order would want to execute.
    * @param {number} size - The target size of orders to accumulate.
    * @param {number} bufferPercent - The buffer percentage to apply to the target size.
    * @returns {Promise<number[]>} A promise that resolves to an array of sell order IDs.
    */
    getSellOrdersForSize(size, bufferPercent) {
        return __awaiter(this, void 0, void 0, function* () {
            const orders = yield this.getSellOrders(); // Fetch only sell orders
            const targetSize = size + (bufferPercent / 100) * size;
            let accumulatedSize = 0;
            let orderIds = [];
            // Sort sell orders by price (descending), then by acceptable range (ascending)
            const sortedSellOrders = orders.sort((a, b) => {
                return a.price === b.price ? a.acceptable_range - b.acceptable_range : a.price - b.price;
            });
            for (const order of sortedSellOrders) {
                if (accumulatedSize >= targetSize)
                    break;
                accumulatedSize += order.size;
                orderIds.push(order.order_id);
            }
            return orderIds;
        });
    }
}
exports.default = OrderBookService;
