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
const orderbookClient_1 = __importDefault(require("../src/orderbookClient"));
const CranklessOrderBook_json_1 = __importDefault(require("../abi/CranklessOrderBook.json"));
const IERC20_json_1 = __importDefault(require("../abi/IERC20.json"));
const orderbookService_1 = __importDefault(require("../src/orderbookService"));
const privateKey = "";
const rpcUrl = "http://localhost:8545";
const contractAddress = "0xa67eD9FFcAE32A1B6c63D8A5E469446FAa8a8704";
const baseTokenAddress = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";
const quoteTokenAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const dbConfig = {
    user: "username",
    host: "localhost", // or the database server's address
    database: "orderbook",
    password: "password",
    port: 5432,
};
const sdk = new orderbookClient_1.default(new orderbookService_1.default(dbConfig), privateKey, rpcUrl, contractAddress, CranklessOrderBook_json_1.default.abi, baseTokenAddress, quoteTokenAddress, IERC20_json_1.default.abi);
// Example usage
(() => __awaiter(void 0, void 0, void 0, function* () {
    // await sdk.addBuyOrder(100, 1000);
    // await sdk.addSellOrder(200, 500);
    // await sdk.placeMultipleBuyOrders([100, 150], [1000, 1500]);
    // await sdk.placeMultipleSellOrders([200, 250], [500, 750]);
    // await sdk.cancelOrders([3, 4], [true, false]);
    // await sdk.replaceOrders([5, 6], [110, 260]);
    yield sdk.estimateGasForLimitOrder(180000, 2 * 10 ** 10, true);
}))();
