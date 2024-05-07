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
var ethers_1 = require("ethers");
var IERC20_json_1 = require("../../abi/IERC20.json");
require('dotenv').config();
var MarginAccountClient = /** @class */ (function () {
    function MarginAccountClient(privateKey, rpcUrl, marginAccountAddress, marginAccountABI) {
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers_1.ethers.Wallet(privateKey, this.provider);
        this.marginAccount = new ethers_1.ethers.Contract(marginAccountAddress, marginAccountABI, this.wallet);
    }
    MarginAccountClient.prototype.approveToken = function (tokenContractAddress, amount, decimals) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenContract, formattedAmount, tx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tokenContract = new ethers_1.ethers.Contract(tokenContractAddress, IERC20_json_1.default.abi, this.wallet);
                        formattedAmount = ethers_1.ethers.parseUnits(amount.toString(), decimals);
                        return [4 /*yield*/, tokenContract.approve(this.marginAccount.getAddress(), formattedAmount)];
                    case 1:
                        tx = _a.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 2:
                        _a.sent();
                        console.log("Approval successful for ".concat(formattedAmount.toString(), " tokens"));
                        return [2 /*return*/];
                }
            });
        });
    };
    MarginAccountClient.prototype.deposit = function (userAddress, tokenAddress, amount, decimals) {
        return __awaiter(this, void 0, void 0, function () {
            var formattedAmount, tx, tx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        formattedAmount = ethers_1.ethers.parseUnits(amount.toString(), decimals);
                        if (!(tokenAddress === ethers_1.ethers.ZeroAddress)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.marginAccount.deposit(userAddress, tokenAddress, formattedAmount, { value: formattedAmount })];
                    case 1:
                        tx = _a.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 2:
                        _a.sent();
                        console.log('ETH Deposit successful:', tx);
                        return [3 /*break*/, 7];
                    case 3: return [4 /*yield*/, this.approveToken(tokenAddress, amount, decimals)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, this.marginAccount.deposit(userAddress, tokenAddress, formattedAmount)];
                    case 5:
                        tx = _a.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 6:
                        _a.sent();
                        console.log('Token Deposit successful:', tx);
                        _a.label = 7;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    MarginAccountClient.prototype.withdraw = function (amount, tokenAddress, decimals) {
        return __awaiter(this, void 0, void 0, function () {
            var formattedAmount, tx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        formattedAmount = ethers_1.ethers.parseUnits(amount.toString(), decimals);
                        return [4 /*yield*/, this.marginAccount.withdraw(formattedAmount, tokenAddress)];
                    case 1:
                        tx = _a.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 2:
                        _a.sent();
                        console.log('Withdraw successful:', tx);
                        return [2 /*return*/];
                }
            });
        });
    };
    MarginAccountClient.prototype.getBalance = function (userAddress, tokenAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var balance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.marginAccount.getBalance(userAddress, tokenAddress)];
                    case 1:
                        balance = _a.sent();
                        console.log("Balance for ".concat(userAddress, ": ").concat(ethers_1.ethers.formatEther(balance), " tokens"));
                        return [2 /*return*/, parseFloat(ethers_1.ethers.formatEther(balance))];
                }
            });
        });
    };
    return MarginAccountClient;
}());
exports.default = MarginAccountClient;
