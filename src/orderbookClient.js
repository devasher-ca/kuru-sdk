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
class OrderbookClient {
    constructor(privateKey, rpcUrl, orderbookAddress, orderbookABI) {
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers_1.ethers.Wallet(privateKey, this.provider);
        this.orderbook = new ethers_1.ethers.Contract(orderbookAddress, orderbookABI, this.wallet);
    }
    addBuyOrder(price, size) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.addBuyOrder(price, size);
            yield tx.wait();
            console.log('Buy order added:', tx);
        });
    }
    addSellOrder(price, size) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.addSellOrder(price, size);
            yield tx.wait();
            console.log('Sell order added:', tx);
        });
    }
    cancelSellOrder(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.cancelSellOrder(orderId);
            yield tx.wait();
            console.log('Sell order cancelled:', tx);
        });
    }
    cancelBuyOrder(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.cancelBuyOrder(orderId);
            yield tx.wait();
            console.log('Buy order cancelled:', tx);
        });
    }
    placeMultipleBuyOrders(prices, sizes) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.placeMultipleBuyOrders(prices, sizes);
            yield tx.wait();
            console.log('Multiple buy orders placed:', tx);
        });
    }
    placeMultipleSellOrders(prices, sizes) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.placeMultipleSellOrders(prices, sizes);
            yield tx.wait();
            console.log('Multiple sell orders placed:', tx);
        });
    }
    batchCancelOrders(orderIds, isBuy) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.batchCancelOrders(orderIds, isBuy);
            yield tx.wait();
            console.log('Batch orders cancelled:', tx);
        });
    }
    replaceOrders(orderIds, isBuy, prices) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.replaceOrders(orderIds, isBuy, prices);
            yield tx.wait();
            console.log('Orders replaced:', tx);
        });
    }
    placeAndExecuteMarketBuy(orderIds, size, isFillOrKill) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.placeAndExecuteMarketBuy(orderIds, size, isFillOrKill);
            yield tx.wait();
            console.log('Market buy order executed:', tx);
            return tx.value; // Assuming the function returns the remaining size
        });
    }
    placeAndExecuteMarketSell(orderIds, size, isFillOrKill) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.placeAndExecuteMarketSell(orderIds, size, isFillOrKill);
            yield tx.wait();
            console.log('Market sell order executed:', tx);
            return tx.value; // Assuming the function returns the remaining size
        });
    }
    placeAggressiveLimitSell(orderIds, size, price) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.placeAggressiveLimitSell(orderIds, size, price);
            yield tx.wait();
            console.log('Aggressive limit sell order placed:', tx);
        });
    }
    placeAggressiveLimitBuy(orderIds, size, price) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.placeAggressiveLimitBuy(orderIds, size, price);
            yield tx.wait();
            console.log('Aggressive limit buy order placed:', tx);
        });
    }
}
exports.default = OrderbookClient;
