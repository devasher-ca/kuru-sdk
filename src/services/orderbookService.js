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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var pg_1 = require("pg");
var OrderBookService = /** @class */ (function () {
    function OrderBookService(marketAddress, dbConfig) {
        this.marketAddress = marketAddress;
        this.db = new pg_1.Pool(dbConfig);
    }
    /**
     * Fetches all orders from the orderbook.
     * @returns {Promise<Order[]>} A promise that resolves to an array of Order objects.
     */
    OrderBookService.prototype.getOrders = function () {
        return __awaiter(this, void 0, void 0, function () {
            var res, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.db.query("SELECT * FROM orderbook_".concat(this.marketAddress))];
                    case 1:
                        res = _a.sent();
                        return [2 /*return*/, res.rows];
                    case 2:
                        error_1 = _a.sent();
                        console.error("Error fetching data from orders:", error_1);
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Fetches all buy orders from the orderbook.
     * @returns {Promise<Order[]>} A promise that resolves to an array of buy Order objects.
     */
    OrderBookService.prototype.getBuyOrders = function () {
        return __awaiter(this, void 0, void 0, function () {
            var res, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.db.query("SELECT * FROM orderbook_".concat(this.marketAddress, " WHERE is_buy=true"))];
                    case 1:
                        res = _a.sent();
                        return [2 /*return*/, res.rows];
                    case 2:
                        error_2 = _a.sent();
                        console.error("Error fetching data from orders:", error_2);
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Fetches all sell orders from the orderbook.
     * @returns {Promise<Order[]>} A promise that resolves to an array of sell Order objects.
     */
    OrderBookService.prototype.getSellOrders = function () {
        return __awaiter(this, void 0, void 0, function () {
            var res, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.db.query("SELECT * FROM orderbook_".concat(this.marketAddress, " WHERE is_buy=false"))];
                    case 1:
                        res = _a.sent();
                        return [2 /*return*/, res.rows];
                    case 2:
                        error_3 = _a.sent();
                        console.error("Error fetching data from orders:", error_3);
                        throw error_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Fetches orders for a specific user.
     * @param {string} ownerAddress - The address of the order owner.
     * @returns {Promise<Order[]>} A promise that resolves to an array of Order objects owned by the specified user.
     */
    OrderBookService.prototype.getOrderForUser = function (ownerAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var query, res, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "SELECT * FROM orderbook_".concat(this.marketAddress, " WHERE owner_address = $1");
                        return [4 /*yield*/, this.db.query(query, [ownerAddress])];
                    case 1:
                        res = _a.sent();
                        return [2 /*return*/, res.rows];
                    case 2:
                        error_4 = _a.sent();
                        console.error("Error fetching data for user ".concat(ownerAddress, ":"), error_4);
                        throw error_4;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Fetches a specific order by its ID.
     * @param {number} orderId - The ID of the order to fetch.
     * @returns {Promise<Order | null>} A promise that resolves to the Order object if found, or null otherwise.
     */
    OrderBookService.prototype.getOrder = function (orderId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, res, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "SELECT * FROM orderbook_".concat(this.marketAddress, " WHERE order_id = $1");
                        return [4 /*yield*/, this.db.query(query, [orderId])];
                    case 1:
                        res = _a.sent();
                        if (res.rows.length === 0) {
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/, res.rows[0]];
                    case 2:
                        error_5 = _a.sent();
                        console.error("Error fetching order with ID ".concat(orderId, ":"), error_5);
                        throw error_5;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Fetches the Level 3 order book, including detailed order information.
     * @returns {Promise<any>} A promise that resolves to the Level 3 order book.
     */
    OrderBookService.prototype.getL3OrderBook = function () {
        return __awaiter(this, void 0, void 0, function () {
            var orders, orderBook, addOrder, sortOrdersByRange, sortMapDescendingByPrice;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getOrders()];
                    case 1:
                        orders = _a.sent();
                        orderBook = {
                            buyOrders: new Map(),
                            sellOrders: new Map()
                        };
                        addOrder = function (order, orderMap) {
                            var _a;
                            if (!orderMap.has(order.price)) {
                                orderMap.set(order.price, []);
                            }
                            (_a = orderMap.get(order.price)) === null || _a === void 0 ? void 0 : _a.push(order);
                        };
                        sortOrdersByRange = function (ordersList) {
                            ordersList.sort(function (a, b) { return a.order_id - b.order_id; });
                        };
                        orders.forEach(function (order) {
                            var targetMap = order.is_buy ? orderBook.buyOrders : orderBook.sellOrders;
                            addOrder(order, targetMap);
                        });
                        orderBook.buyOrders.forEach(sortOrdersByRange);
                        orderBook.sellOrders.forEach(sortOrdersByRange);
                        sortMapDescendingByPrice = function (map) {
                            return new Map(__spreadArray([], map.entries(), true).sort(function (a, b) { return b[0] - a[0]; }));
                        };
                        return [2 /*return*/, {
                                buyOrders: sortMapDescendingByPrice(orderBook.buyOrders),
                                sellOrders: sortMapDescendingByPrice(orderBook.sellOrders)
                            }];
                }
            });
        });
    };
    /**
     * Fetches the Level 2 order book, including aggregated order sizes by price point.
     * @returns {Promise<any>} A promise that resolves to the Level 2 order book.
     */
    OrderBookService.prototype.getL2OrderBook = function () {
        return __awaiter(this, void 0, void 0, function () {
            var orders, buys, sells, sortArrayDescending;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getOrders()];
                    case 1:
                        orders = _a.sent();
                        buys = [];
                        sells = [];
                        orders.forEach(function (order) {
                            var targetList = order.is_buy ? buys : sells;
                            var found = targetList.find(function (o) { return o.price === order.price; });
                            if (found) {
                                found.quantity += Number(order.size);
                            }
                            else {
                                targetList.push({ price: order.price, quantity: Number(order.size) });
                            }
                        });
                        sortArrayDescending = function (array) {
                            return array.sort(function (a, b) { return b.price - a.price; });
                        };
                        return [2 /*return*/, {
                                sellOrders: sortArrayDescending(sells),
                                buyOrders: sortArrayDescending(buys),
                            }];
                }
            });
        });
    };
    /**
     * Checks if an order is active.
     * @param {number} orderId - The ID of the order to check.
     * @returns {Promise<boolean>} A promise that resolves to true if the order is active, false otherwise.
     */
    OrderBookService.prototype.isOrderActive = function (orderId) {
        return __awaiter(this, void 0, void 0, function () {
            var order;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getOrder(orderId)];
                    case 1:
                        order = _a.sent();
                        return [2 /*return*/, order != null];
                }
            });
        });
    };
    /**
     * Calculates the average buy price for a specified size.
     *
     * This function fetches all buy orders from the database. It then sorts these orders by price in ascending order.
     * In cases where multiple orders have the same price, they are sorted by their order Id in ascending order.
     * The function iterates over these sorted orders, summing up their sizes until it reaches or exceeds the specified 'size'.
     * Simultaneously, it accumulates the total price of these orders and counts the number of orders considered.
     * Finally, the function calculates the average price by dividing the total price by the number of orders.
     * This average price is representative of the average cost per unit for the given 'size'.
     *
     * @param {number} size - The total size for which the average buy price is calculated.
     * @returns {Promise<number>} - A promise that resolves to the average buy price for the specified size.
     */
    OrderBookService.prototype.getAvgBuyPriceForSize = function (size) {
        return __awaiter(this, void 0, void 0, function () {
            var orders, sortedBuyOrders, accumulatedSize, totalPrice, _i, sortedBuyOrders_1, order;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getBuyOrders()];
                    case 1:
                        orders = _a.sent();
                        sortedBuyOrders = orders.sort(function (a, b) {
                            return a.price === b.price ? a.order_id - b.order_id : b.price - a.price;
                        });
                        accumulatedSize = 0;
                        totalPrice = 0;
                        for (_i = 0, sortedBuyOrders_1 = sortedBuyOrders; _i < sortedBuyOrders_1.length; _i++) {
                            order = sortedBuyOrders_1[_i];
                            if (accumulatedSize >= size)
                                break;
                            accumulatedSize += Number(order.size);
                            totalPrice += order.price;
                        }
                        return [2 /*return*/, totalPrice / size];
                }
            });
        });
    };
    return OrderBookService;
}());
exports.default = OrderBookService;
