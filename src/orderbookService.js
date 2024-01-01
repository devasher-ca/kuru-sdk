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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const OrderStorageService_1 = __importDefault(require("./OrderStorageService"));
class OrderBookService {
    constructor(privateKey, rpcUrl, contractAddress, contractABI) {
        const provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
        this.contract = new ethers_1.ethers.Contract(contractAddress, contractABI, wallet);
        this.orderStorageService = new OrderStorageService_1.default(rpcUrl, contractAddress, contractABI);
        // start listening?
        this.orderStorageService.listenForOrderEvents();
    }
    getBuyPricePoints() {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: use graphql query to get all price point keys
            const buyPricePointsKeys = yield this.contract.getBuyPricePointsKeys();
            const buyPricePoints = new Map();
            for (const key of buyPricePointsKeys) {
                const point = yield this.contract.buyPricePoints(key);
                buyPricePoints.set(key, {
                    totalCompletedOrCanceledOrders: point.totalCompletedOrCanceledOrders,
                    totalOrdersAtPrice: point.totalOrdersAtPrice,
                    executableSize: point.executableSize,
                });
            }
            return buyPricePoints;
        });
    }
    getSellPricePoints() {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: use graphql query to get all price point keys
            const sellPricePointsKeys = yield this.contract.getSellPricePointsKeys();
            const sellPricePoints = new Map();
            for (const key of sellPricePointsKeys) {
                const point = yield this.contract.sellPricePoints(key);
                sellPricePoints.set(key, {
                    totalCompletedOrCanceledOrders: point.totalCompletedOrCanceledOrders,
                    totalOrdersAtPrice: point.totalOrdersAtPrice,
                    executableSize: point.executableSize,
                });
            }
            return sellPricePoints;
        });
    }
    getOrders() {
        return __awaiter(this, void 0, void 0, function* () {
            // Assuming the contract has a method to fetch all orders
            const orders = yield this.contract.getOrders();
            return orders.map((order) => ({
                ownerAddress: order.ownerAddress,
                price: order.price,
                size: order.size,
                acceptableRange: order.acceptableRange,
                isBuy: order.isBuy,
            }));
        });
    }
    getOrderBook() {
        return __awaiter(this, void 0, void 0, function* () {
            const buyPricePointsMap = yield this.getBuyPricePoints();
            const sellPricePointsMap = yield this.getSellPricePoints();
            const orders = yield this.getOrders();
            const buyPricePoints = Array.from(buyPricePointsMap.entries())
                .filter(([price, point]) => point.totalCompletedOrCanceledOrders < point.totalOrdersAtPrice)
                .sort((a, b) => a[0] - b[0])
                .map(([price, point]) => (Object.assign({ price }, point)));
            const sellPricePoints = Array.from(sellPricePointsMap.entries())
                .filter(([price, point]) => point.totalCompletedOrCanceledOrders < point.totalOrdersAtPrice)
                .sort((a, b) => a[0] - b[0])
                .map(([price, point]) => (Object.assign({ price }, point)));
            const buyOrderMap = new Map();
            const sellOrderMap = new Map();
            orders.forEach(order => {
                var _a, _b;
                if (order.isBuy ? !buyOrderMap.has(order.price) : !sellOrderMap.has(order.price)) {
                    order.isBuy ? buyOrderMap.set(order.price, []) : sellOrderMap.set(order.price, []);
                }
                order.isBuy ? (_a = buyOrderMap.get(order.price)) === null || _a === void 0 ? void 0 : _a.push(order) : (_b = sellOrderMap.get(order.price)) === null || _b === void 0 ? void 0 : _b.push(order);
            });
            buyOrderMap.forEach((ordersList, price) => {
                ordersList.sort((a, b) => a.acceptableRange - b.acceptableRange);
            });
            sellOrderMap.forEach((ordersList, price) => {
                ordersList.sort((a, b) => a.acceptableRange - b.acceptableRange);
            });
            return {
                buy: buyPricePoints,
                sell: sellPricePoints,
                buyOrders: buyOrderMap,
                sellOrders: sellOrderMap,
            };
        });
    }
}
exports.default = OrderBookService;
