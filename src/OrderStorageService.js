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
class OrderStorageService {
    constructor(rpcUrl, contractAddress, contractABI) {
        const provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        this.orders = new Map();
        this.contract = new ethers_1.ethers.Contract(contractAddress, contractABI, provider);
        // this should be used to initialize orderbook state from past events of contract
    }
    listenForOrderEvents() {
        return __awaiter(this, void 0, void 0, function* () {
            this.contract.on('OrderCreated', (orderId, ownerAddress, price, size, acceptableRange, isBuy) => {
                console.log(`OrderCreated event detected for orderId: ${orderId} owner: ${ownerAddress} price: ${price} size: ${size} isBuy: ${isBuy}`);
                this.orders.set(orderId, { ownerAddress, price, size, acceptableRange, isBuy });
            });
            this.contract.on('OrderUpdated', (orderId, ownerAddress, price, size, acceptableRange, isBuy) => {
                console.log(`OrderUpdated event detected for orderId: ${orderId} owner: ${ownerAddress} price: ${price} size: ${size} isBuy: ${isBuy}`);
                if (this.orders.has(orderId)) {
                    this.orders.set(orderId, { ownerAddress, price, size, acceptableRange, isBuy });
                }
            });
            this.contract.on('OrderCompletedOrCanceled', (orderId, owner, isBuy) => {
                console.log(`OrderCompletedOrCanceled event detected for orderId: ${orderId} owner: ${owner} isBuy: ${isBuy}`);
                this.orders.delete(orderId);
            });
        });
    }
    getOrders() {
        return this.orders;
    }
}
exports.default = OrderStorageService;
