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
const orderbookService_1 = __importDefault(require("../src/orderbookService"));
const CranklessOrderBook_json_1 = __importDefault(require("../abi/CranklessOrderBook.json"));
const privateKey = 'f94f2358316ae919ed24243bcf55fd3638539676d30acab3d1b25b7717b5ae38';
const rpcUrl = 'http://localhost:8545';
const contractAddress = '0x5771c832D78fDf76A3DA918E4B7a49c062910639';
const sdkService = new orderbookService_1.default(privateKey, rpcUrl, contractAddress, CranklessOrderBook_json_1.default.abi);
// Example usage
(() => __awaiter(void 0, void 0, void 0, function* () {
    const buyPricePoints = yield sdkService.getBuyPricePoints();
    console.log(buyPricePoints);
}))();
