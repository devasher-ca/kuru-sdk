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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var orderBookClient_1 = require("../src/client/orderBookClient");
var marginAccountClient_1 = require("../src/client/marginAccountClient");
var CranklessOrderBook_json_1 = require("../abi/CranklessOrderBook.json");
var MarginAccount_json_1 = require("../abi/MarginAccount.json");
var IERC20_json_1 = require("../abi/IERC20.json");
var userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
var privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
var rpcUrl = "http://localhost:8545";
var contractAddress = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
var marginAccountAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
var baseTokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
var quoteTokenAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
var sdk = new orderBookClient_1.default(privateKey, rpcUrl, contractAddress, CranklessOrderBook_json_1.default.abi, baseTokenAddress, quoteTokenAddress, IERC20_json_1.default.abi);
var marginAccountSdk = new marginAccountClient_1.default(privateKey, rpcUrl, marginAccountAddress, MarginAccount_json_1.default.abi);
var args = process.argv.slice(2);
var price = parseFloat(args[0]);
var quantity = parseFloat(args[1]);
(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, marginAccountSdk.deposit(userAddress, quoteTokenAddress, 1000000, 18)];
            case 1:
                _a.sent();
                return [4 /*yield*/, sdk.addBuyOrder(price * Math.pow(10, 2), quantity * Math.pow(10, 10))];
            case 2:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); })();
