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
const fs_1 = __importDefault(require("fs"));
const orderbookService_1 = __importDefault(require("../src/orderbookService"));
const console_1 = require("console");
const mapToObject = (map) => {
    const obj = {};
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
const sdkService = new orderbookService_1.default(dbConfig);
// Example usage
(() => __awaiter(void 0, void 0, void 0, function* () {
    const L3Orderbook = yield sdkService.getL3OrderBook();
    fs_1.default.writeFileSync('./tmp/L3Orderbook.json', JSON.stringify({
        buyOrders: mapToObject(L3Orderbook.buyOrders),
        sellOrders: mapToObject(L3Orderbook.sellOrders),
    }));
    const L2Orderbook = yield sdkService.getL2OrderBook();
    fs_1.default.writeFileSync('./tmp/L2Orderbook.json', JSON.stringify({ L2Orderbook }));
    const userOrders = yield sdkService.getOrderForUser("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    if (userOrders.length == 0) {
        throw (0, console_1.error)("user order has to be positive");
    }
    const zeroOrders = yield sdkService.getOrderForUser("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92267");
    if (zeroOrders.length != 0) {
        throw (0, console_1.error)("zero order has to be zero");
    }
    const activeOrder = yield sdkService.isOrderActive(167);
    if (!activeOrder) {
        throw (0, console_1.error)("order has to be active");
    }
    const inactiveOrder = yield sdkService.isOrderActive(1);
    if (inactiveOrder) {
        throw (0, console_1.error)("order has to be inactive");
    }
    const orderIdsForSize = yield sdkService.getBuyOrdersForSize(1000000000, 30);
    console.log(orderIdsForSize);
}))();
