"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const OrderStorageService_1 = __importDefault(require("../src/OrderStorageService"));
const CranklessOrderBook_json_1 = __importDefault(require("../abi/CranklessOrderBook.json"));
const rpcUrl = 'http://localhost:8545';
const contractAddress = '0xa67eD9FFcAE32A1B6c63D8A5E469446FAa8a8704';
const dbConfig = {
    user: 'username',
    host: 'localhost', // or the database server's address
    database: 'orderbook',
    password: 'password',
    port: 5432,
};
const sdk = new OrderStorageService_1.default(rpcUrl, contractAddress, CranklessOrderBook_json_1.default.abi, dbConfig);
// Start listening for events
sdk.listenForOrderEvents();
