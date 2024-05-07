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
var OrderbookClient = /** @class */ (function () {
    function OrderbookClient(privateKey, rpcUrl, orderbookAddress, orderbookABI, baseTokenAddress, quoteTokenAddress, ERC20ABI) {
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers_1.ethers.Wallet(privateKey, this.provider);
        this.orderbook = new ethers_1.ethers.Contract(orderbookAddress, orderbookABI, this.wallet);
        this.baseToken = new ethers_1.ethers.Contract(baseTokenAddress, ERC20ABI, this.wallet);
        this.quoteToken = new ethers_1.ethers.Contract(quoteTokenAddress, ERC20ABI, this.wallet);
    }
    OrderbookClient.prototype.approveBase = function (size) {
        return __awaiter(this, void 0, void 0, function () {
            var tx, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _b = (_a = this.baseToken).approve;
                        return [4 /*yield*/, this.orderbook.getAddress()];
                    case 1: return [4 /*yield*/, _b.apply(_a, [_c.sent(), size])];
                    case 2:
                        tx = _c.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 3:
                        _c.sent();
                        console.log("Base tokens approved:");
                        return [2 /*return*/];
                }
            });
        });
    };
    OrderbookClient.prototype.approveQuote = function (size) {
        return __awaiter(this, void 0, void 0, function () {
            var tx, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _b = (_a = this.quoteToken).approve;
                        return [4 /*yield*/, this.orderbook.getAddress()];
                    case 1: return [4 /*yield*/, _b.apply(_a, [_c.sent(), size])];
                    case 2:
                        tx = _c.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 3:
                        _c.sent();
                        console.log("Quote tokens approved");
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * @dev Estimates the gas required to place a limit order.
     * @param {number} price - The price at which the limit order is to be placed.
     * @param {number} size - The size of the order.
     * @param {boolean} isBuy - A boolean indicating whether it's a buy order (true) or sell order (false).
     * @returns {Promise<number>} - A promise that resolves to the estimated gas required for the transaction.
     */
    OrderbookClient.prototype.estimateGasForApproval = function (size, isBase) {
        return __awaiter(this, void 0, void 0, function () {
            var data, _a, _b, _c, transaction, _d, estimatedGas;
            var _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _b = (_a = this.orderbook.interface).encodeFunctionData;
                        _c = ["approve"];
                        return [4 /*yield*/, this.orderbook.getAddress()];
                    case 1:
                        data = _b.apply(_a, _c.concat([[_f.sent(), size]]));
                        _e = {};
                        if (!isBase) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.baseToken.getAddress()];
                    case 2:
                        _d = _f.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, this.quoteToken.getAddress()];
                    case 4:
                        _d = _f.sent();
                        _f.label = 5;
                    case 5:
                        transaction = (_e.to = _d,
                            _e.data = data,
                            _e);
                        return [4 /*yield*/, this.provider.estimateGas(transaction)];
                    case 6:
                        estimatedGas = _f.sent();
                        return [2 /*return*/, estimatedGas];
                }
            });
        });
    };
    OrderbookClient.prototype.placeLimit = function (price, size, isBuy) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, isBuy
                        ? this.addBuyOrder(price, size)
                        : this.addSellOrder(price, size)];
            });
        });
    };
    /**
     * @dev Estimates the gas required to place a limit order.
     * @param {number} price - The price at which the limit order is to be placed.
     * @param {number} size - The size of the order.
     * @param {boolean} isBuy - A boolean indicating whether it's a buy order (true) or sell order (false).
     * @returns {Promise<number>} - A promise that resolves to the estimated gas required for the transaction.
     */
    OrderbookClient.prototype.estimateGasForLimitOrder = function (price, size, isBuy) {
        return __awaiter(this, void 0, void 0, function () {
            var functionName, args, data, transaction, estimatedGas;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        functionName = isBuy ? "addBuyOrder" : "addSellOrder";
                        args = [price, size];
                        data = this.orderbook.interface.encodeFunctionData(functionName, args);
                        transaction = {
                            to: this.orderbook.getAddress(),
                            data: data,
                        };
                        return [4 /*yield*/, this.provider.estimateGas(transaction)];
                    case 1:
                        estimatedGas = _a.sent();
                        return [2 /*return*/, estimatedGas];
                }
            });
        });
    };
    OrderbookClient.prototype.placeFillOrKill = function (size, isBuy) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, isBuy
                        ? this.placeAndExecuteMarketBuy(size, true)
                        : this.placeAndExecuteMarketSell(size, true)];
            });
        });
    };
    OrderbookClient.prototype.placeMarket = function (size, isBuy) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, isBuy
                        ? this.placeAndExecuteMarketBuy(size, false)
                        : this.placeAndExecuteMarketSell(size, false)];
            });
        });
    };
    OrderbookClient.prototype.addBuyOrder = function (price, size) {
        return __awaiter(this, void 0, void 0, function () {
            var tx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.orderbook.addBuyOrder(price, size)];
                    case 1:
                        tx = _a.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 2:
                        _a.sent();
                        console.log("Buy order added:");
                        return [2 /*return*/];
                }
            });
        });
    };
    OrderbookClient.prototype.addSellOrder = function (price, size) {
        return __awaiter(this, void 0, void 0, function () {
            var tx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.orderbook.addSellOrder(price, size)];
                    case 1:
                        tx = _a.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 2:
                        _a.sent();
                        console.log("Sell order added:");
                        return [2 /*return*/];
                }
            });
        });
    };
    OrderbookClient.prototype.placeLimits = function (prices, sizes, isBuy) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, isBuy
                        ? this.placeMultipleBuyOrders(prices, sizes)
                        : this.placeMultipleSellOrders(prices, sizes)];
            });
        });
    };
    OrderbookClient.prototype.placeMultipleBuyOrders = function (prices, sizes) {
        return __awaiter(this, void 0, void 0, function () {
            var tx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.orderbook.placeMultipleBuyOrders(prices, sizes)];
                    case 1:
                        tx = _a.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 2:
                        _a.sent();
                        console.log("Multiple buy orders placed:");
                        return [2 /*return*/];
                }
            });
        });
    };
    OrderbookClient.prototype.placeMultipleSellOrders = function (prices, sizes) {
        return __awaiter(this, void 0, void 0, function () {
            var tx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.orderbook.placeMultipleSellOrders(prices, sizes)];
                    case 1:
                        tx = _a.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 2:
                        _a.sent();
                        console.log("Multiple sell orders placed:");
                        return [2 /*return*/];
                }
            });
        });
    };
    OrderbookClient.prototype.cancelOrders = function (orderIds) {
        return __awaiter(this, void 0, void 0, function () {
            var tx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.orderbook.batchCancelOrders(orderIds)];
                    case 1:
                        tx = _a.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 2:
                        _a.sent();
                        console.log("Batch orders cancelled:", orderIds);
                        return [2 /*return*/];
                }
            });
        });
    };
    OrderbookClient.prototype.replaceOrders = function (orderIds, prices) {
        return __awaiter(this, void 0, void 0, function () {
            var tx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.orderbook.replaceOrders(orderIds, prices)];
                    case 1:
                        tx = _a.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 2:
                        _a.sent();
                        console.log("Orders replaced:");
                        return [2 /*return*/];
                }
            });
        });
    };
    OrderbookClient.prototype.placeAndExecuteMarketBuy = function (size, isFillOrKill) {
        return __awaiter(this, void 0, void 0, function () {
            var tx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.orderbook.placeAndExecuteMarketBuy(size, isFillOrKill)];
                    case 1:
                        tx = _a.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 2:
                        _a.sent();
                        console.log("Market buy order executed:");
                        return [2 /*return*/, tx.value]; // Assuming the function returns the remaining size
                }
            });
        });
    };
    OrderbookClient.prototype.placeAndExecuteMarketSell = function (size, isFillOrKill) {
        return __awaiter(this, void 0, void 0, function () {
            var tx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.orderbook.placeAndExecuteMarketSell(size, isFillOrKill)];
                    case 1:
                        tx = _a.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 2:
                        _a.sent();
                        console.log("Market sell order executed:");
                        return [2 /*return*/, tx.value]; // Assuming the function returns the remaining size
                }
            });
        });
    };
    OrderbookClient.prototype.getL2OrderBook = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data, offset, blockNumber, asks, price, size, bids, price, size;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.orderbook.getL2Book()];
                    case 1:
                        data = _a.sent();
                        offset = 66;
                        blockNumber = parseInt('0x' + data.slice(2, 66), 16);
                        asks = {};
                        while (offset < data.length) {
                            price = parseInt('0x' + data.slice(offset, offset + 64), 16);
                            offset += 64; // Each uint24 is padded to 64 bytes
                            if (price == 0) {
                                break;
                            }
                            size = parseInt('0x' + data.slice(offset, offset + 64), 16);
                            offset += 64; // Each uint96 is padded to 64 bytes
                            //   asks[price.toString()] = size.toString();
                        }
                        bids = {};
                        while (offset < data.length) {
                            price = parseInt('0x' + data.slice(offset, offset + 64), 16);
                            offset += 64; // Each uint24 is padded to 64 bytes
                            size = parseInt('0x' + data.slice(offset, offset + 64), 16);
                            offset += 64; // Each uint96 is padded to 64 bytes
                            //   bids[price.toString()] = size.toString();
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    return OrderbookClient;
}());
exports.default = OrderbookClient;
