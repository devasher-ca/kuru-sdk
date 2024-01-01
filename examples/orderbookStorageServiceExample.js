"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const OrderStorageService_1 = __importDefault(require("../src/OrderStorageService"));
const CranklessOrderBook_json_1 = __importDefault(require("../abi/CranklessOrderBook.json"));
const rpcUrl = 'http://localhost:8545';
const contractAddress = '0x5771c832D78fDf76A3DA918E4B7a49c062910639';
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
