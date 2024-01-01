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
const privateKey = 'YOUR_PRIVATE_KEY';
const rpcUrl = 'YOUR_RPC_URL';
const contractAddress = 'YOUR_CONTRACT_ADDRESS';
const sdk = new orderbookClient_1.default(privateKey, rpcUrl, contractAddress, CranklessOrderBook_json_1.default);
// Example usage
(() => __awaiter(void 0, void 0, void 0, function* () {
    yield sdk.addBuyOrder(100, 1000);
    yield sdk.addSellOrder(200, 500);
    yield sdk.cancelSellOrder(1);
    yield sdk.cancelBuyOrder(2);
    yield sdk.placeMultipleBuyOrders([100, 150], [1000, 1500]);
    yield sdk.placeMultipleSellOrders([200, 250], [500, 750]);
    yield sdk.batchCancelOrders([3, 4], [true, false]);
    yield sdk.replaceOrders([5, 6], [true, false], [110, 260]);
}))();
