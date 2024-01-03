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
        // TODO: fetch historic event data and populate db
    }
    saveOrder(orderId, ownerAddress, price, size, acceptableRange, isBuy) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
            INSERT INTO orderbook (order_id, owner_address, price, size, acceptable_range, is_buy)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (order_id) DO UPDATE
            SET owner_address = EXCLUDED.owner_address, price = EXCLUDED.price, size = EXCLUDED.size, acceptable_range = EXCLUDED.acceptable_range, is_buy = EXCLUDED.is_buy;
        `;
            yield this.db.query(query, [orderId, ownerAddress, price, size, acceptableRange, isBuy]);
        });
    }
    deleteOrders(orderIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `DELETE FROM orderbook WHERE order_id = ANY($1);`;
            yield this.db.query(query, [orderIds]);
        });
    }
    listenForOrderEvents() {
        return __awaiter(this, void 0, void 0, function* () {
            this.contract.on('OrderCreated', (orderId, ownerAddress, price, size, acceptableRange, isBuy) => __awaiter(this, void 0, void 0, function* () {
                console.log(`OrderCreated event detected for orderId: ${orderId} owner: ${ownerAddress} price: ${price} size: ${size} isBuy: ${isBuy}`);
                yield this.saveOrder(orderId, ownerAddress, price, size, acceptableRange, isBuy);
                console.log(`Order Saved: ${orderId}`);
            }));
            this.contract.on('OrderUpdated', (orderId, ownerAddress, price, size, acceptableRange, isBuy) => __awaiter(this, void 0, void 0, function* () {
                console.log(`OrderUpdated event detected for orderId: ${orderId} owner: ${ownerAddress} price: ${price} size: ${size} isBuy: ${isBuy}`);
                yield this.saveOrder(orderId, ownerAddress, price, size, acceptableRange, isBuy);
                console.log(`Order Updated: ${orderId}`);
            }));
            this.contract.on('OrdersCompletedOrCanceled', (orderIds) => __awaiter(this, void 0, void 0, function* () {
                console.log(`OrderCompletedOrCanceled event detected for orderId: ${orderIds}`);
                yield this.deleteOrders(orderIds);
                console.log(`Order Deleted: ${orderIds}`);
            }));
        });
    }
}
exports.default = OrderStorageService;
