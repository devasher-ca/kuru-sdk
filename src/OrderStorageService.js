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
class OrderStorageService {
    constructor(rpcUrl, contractAddress, contractABI, dbConfig) {
        const provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        this.contract = new ethers_1.ethers.Contract(contractAddress, contractABI, provider);
        // Initialize the database connection
        this.db = new pg_1.Pool(dbConfig);
        // TODO: fetch historic event data and populate db(indexer?)
    }
    saveOrder(orderId, ownerAddress, price, size, acceptableRange, isBuy) {
        return __awaiter(this, void 0, void 0, function* () {
            const dbPromises = [];
            const orderbookQuery = `
            INSERT INTO orderbook (order_id, owner_address, price, size, acceptable_range, is_buy, is_updated)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
            dbPromises.push(this.db
                .query(orderbookQuery, [
                orderId,
                ownerAddress,
                price,
                size,
                acceptableRange,
                isBuy,
                false,
            ])
                .catch((error) => console.error(`Error updating order size: ${error}`)));
            const orderQuery = `
            INSERT INTO orders (order_id, owner_address, price, size, acceptable_range, is_buy)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
            dbPromises.push(this.db
                .query(orderQuery, [
                orderId,
                ownerAddress,
                price,
                size,
                acceptableRange,
                isBuy,
            ])
                .catch((error) => console.error(`Error inserting orders: ${error}`)));
            yield Promise.all(dbPromises);
        });
    }
    updateOrderSize(orderId, newSize) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
            UPDATE orderbook 
            SET size = $2, is_updated = true
            WHERE order_id = $1;
        `;
            yield this.db.query(query, [orderId, newSize]);
        });
    }
    deleteOrders(orderIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `DELETE FROM orderbook WHERE order_id = ANY($1);`;
            yield this.db.query(query, [orderIds]);
        });
    }
    addTrade(takerAddress, size, isBuy, orderIds, timestamp) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
            INSERT INTO trades (taker_address, size, is_buy, maker_orders, timestamp)
            VALUES ($1, $2, $3, $4, $5)
        `;
            yield this.db.query(query, [takerAddress, size, isBuy, orderIds, timestamp]);
        });
    }
    listenForOrderEvents() {
        return __awaiter(this, void 0, void 0, function* () {
            this.contract.on("OrderCreated", (orderId, ownerAddress, price, size, acceptableRange, isBuy) => __awaiter(this, void 0, void 0, function* () {
                console.log(`OrderCreated event detected for orderId: ${orderId} owner: ${ownerAddress} price: ${price} size: ${size} isBuy: ${isBuy}`);
                yield this.saveOrder(orderId, ownerAddress, price, size, acceptableRange, isBuy);
                console.log(`Order Saved: ${orderId}`);
            }));
            this.contract.on("OrdersUpdated", (orderIds, updatedSizes) => __awaiter(this, void 0, void 0, function* () {
                console.log(`OrdersUpdated event detected for orderIds: ${orderIds} updatedSizes: ${updatedSizes}`);
                const deletedOrders = [];
                const updatePromises = [];
                for (let i = 0; i < orderIds.length; i++) {
                    updatedSizes[i] === 0
                        ? updatePromises.push(this.updateOrderSize(orderIds[i], updatedSizes[i]).catch((error) => console.error(`Error updating order size: ${error}`)))
                        : deletedOrders.push(orderIds[i]);
                }
                if (deletedOrders.length > 0) {
                    console.log(`OrdersDeleted: ${deletedOrders}`);
                    updatePromises.push(this.deleteOrders(deletedOrders).catch((error) => console.error(`Error deleting orders: ${error}`)));
                }
                yield Promise.all(updatePromises);
                console.log(`Orders Updated: ${orderIds}`);
            }));
            this.contract.on("SellIOC", (takerAddress, orderSize, orderIds, updatedSizes) => __awaiter(this, void 0, void 0, function* () {
                console.log(`SellIOC event detected for orderIds: ${orderIds} updatedSizes: ${updatedSizes}`);
                const deletedOrders = [];
                const updatePromises = [];
                for (let i = 0; i < orderIds.length; i++) {
                    updatedSizes[i] === 0
                        ? updatePromises.push(this.updateOrderSize(orderIds[i], updatedSizes[i]).catch((error) => console.error(`Error updating order size: ${error}`)))
                        : deletedOrders.push(orderIds[i]);
                }
                if (deletedOrders.length > 0) {
                    console.log(`OrdersDeleted: ${deletedOrders}`);
                    updatePromises.push(this.deleteOrders(deletedOrders).catch((error) => console.error(`Error deleting orders: ${error}`)));
                }
                yield Promise.all(updatePromises);
                yield this.addTrade(takerAddress, orderSize, false, orderIds, Date.now());
                console.log(`Orders Updated: ${orderIds}`);
            }));
            this.contract.on("BuyIOC", (takerAddress, orderSize, orderIds, updatedSizes) => __awaiter(this, void 0, void 0, function* () {
                console.log(`BuyIOC event detected for orderIds: ${orderIds} updatedSizes: ${updatedSizes}`);
                const deletedOrders = [];
                const updatePromises = [];
                for (let i = 0; i < orderIds.length; i++) {
                    updatedSizes[i] === 0
                        ? updatePromises.push(this.updateOrderSize(orderIds[i], updatedSizes[i]).catch((error) => console.error(`Error updating order size: ${error}`)))
                        : deletedOrders.push(orderIds[i]);
                }
                if (deletedOrders.length > 0) {
                    console.log(`OrdersDeleted: ${deletedOrders}`);
                    updatePromises.push(this.deleteOrders(deletedOrders).catch((error) => console.error(`Error deleting orders: ${error}`)));
                }
                yield Promise.all(updatePromises);
                yield this.addTrade(takerAddress, orderSize, true, orderIds, Date.now());
                console.log(`Orders Updated: ${orderIds}`);
            }));
            this.contract.on("OrdersCanceled", (orderIds) => __awaiter(this, void 0, void 0, function* () {
                console.log(`OrdersCanceled event detected for orderId: ${orderIds}`);
                yield this.deleteOrders(orderIds);
                console.log(`Order Deleted: ${orderIds}`);
            }));
        });
    }
}
exports.default = OrderStorageService;
