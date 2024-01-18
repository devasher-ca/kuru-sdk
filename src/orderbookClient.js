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
const ethers_1 = require("ethers");
const orderbookService_1 = __importDefault(require("./orderbookService"));
class OrderbookClient {
    constructor(orderbookService, privateKey, rpcUrl, orderbookAddress, orderbookABI, baseTokenAddress, quoteTokenAddress, ERC20ABI) {
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers_1.ethers.Wallet(privateKey, this.provider);
        this.orderbook = new ethers_1.ethers.Contract(orderbookAddress, orderbookABI, this.wallet);
        this.baseToken = new ethers_1.ethers.Contract(baseTokenAddress, ERC20ABI, this.wallet);
        this.quoteToken = new ethers_1.ethers.Contract(quoteTokenAddress, ERC20ABI, this.wallet);
        this.orderbookService = new orderbookService_1.default(orderbookService);
    }
    approveBase(size) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.baseToken.approve(yield this.orderbook.getAddress(), size);
            yield tx.wait();
            console.log("Base tokens approved:", tx);
        });
    }
    approveQuote(size) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.quoteToken.approve(yield this.orderbook.getAddress(), size);
            yield tx.wait();
            console.log("Quote tokens approved", tx);
        });
    }
    /**
     * @dev Estimates the gas required to place a limit order.
     * @param {number} price - The price at which the limit order is to be placed.
     * @param {number} size - The size of the order.
     * @param {boolean} isBuy - A boolean indicating whether it's a buy order (true) or sell order (false).
     * @returns {Promise<number>} - A promise that resolves to the estimated gas required for the transaction.
     */
    estimateGasForApproval(size, isBase) {
        return __awaiter(this, void 0, void 0, function* () {
            // Encode the function call
            const data = this.orderbook.interface.encodeFunctionData("approve", [yield this.orderbook.getAddress(), size]);
            // Create the transaction object
            const transaction = {
                to: isBase ? yield this.baseToken.getAddress() : yield this.quoteToken.getAddress(),
                data: data,
            };
            // Estimate gas
            const estimatedGas = yield this.provider.estimateGas(transaction);
            return estimatedGas;
        });
    }
    placeLimit(price, size, isBuy) {
        return __awaiter(this, void 0, void 0, function* () {
            return isBuy
                ? this.addBuyOrder(price, size)
                : this.addSellOrder(price, size);
        });
    }
    /**
     * @dev Estimates the gas required to place a limit order.
     * @param {number} price - The price at which the limit order is to be placed.
     * @param {number} size - The size of the order.
     * @param {boolean} isBuy - A boolean indicating whether it's a buy order (true) or sell order (false).
     * @returns {Promise<number>} - A promise that resolves to the estimated gas required for the transaction.
     */
    estimateGasForLimitOrder(price, size, isBuy) {
        return __awaiter(this, void 0, void 0, function* () {
            // Make sure the function name and arguments match the contract
            const functionName = isBuy ? "addBuyOrder" : "addSellOrder";
            const args = [price, size]; // Adjust the arguments as per the contract method
            // Encode the function call
            const data = this.orderbook.interface.encodeFunctionData(functionName, args);
            // Create the transaction object
            const transaction = {
                to: this.orderbook.getAddress(),
                data: data,
            };
            // Estimate gas
            const estimatedGas = yield this.provider.estimateGas(transaction);
            return estimatedGas;
        });
    }
    placeAggressiveLimit(price, size, isBuy) {
        return __awaiter(this, void 0, void 0, function* () {
            return isBuy
                ? this.addBuyOrder(price, size)
                : this.addSellOrder(price, size);
        });
    }
    placeFillOrKill(size, bufferPercent, isBuy) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const orderIds = isBuy
                ? (yield ((_a = this.orderbookService) === null || _a === void 0 ? void 0 : _a.getSellOrdersForSize(size, bufferPercent))) || []
                : (yield ((_b = this.orderbookService) === null || _b === void 0 ? void 0 : _b.getBuyOrdersForSize(size, bufferPercent))) || [];
            return isBuy
                ? this.placeAndExecuteMarketBuy(orderIds, size, true)
                : this.placeAndExecuteMarketSell(orderIds, size, true);
        });
    }
    placeMarket(size, bufferPercent, isBuy) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const orderIds = isBuy
                ? (yield ((_a = this.orderbookService) === null || _a === void 0 ? void 0 : _a.getSellOrdersForSize(size, bufferPercent))) || []
                : (yield ((_b = this.orderbookService) === null || _b === void 0 ? void 0 : _b.getBuyOrdersForSize(size, bufferPercent))) || [];
            return isBuy
                ? this.placeAndExecuteMarketBuy(orderIds, size, false)
                : this.placeAndExecuteMarketSell(orderIds, size, false);
        });
    }
    addBuyOrder(price, size) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.addBuyOrder(price, size);
            yield tx.wait();
            console.log("Buy order added:", tx);
        });
    }
    addSellOrder(price, size) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.addSellOrder(price, size);
            yield tx.wait();
            console.log("Sell order added:", tx);
        });
    }
    placeLimits(prices, sizes, isBuy) {
        return __awaiter(this, void 0, void 0, function* () {
            return isBuy
                ? this.placeMultipleBuyOrders(prices, sizes)
                : this.placeMultipleSellOrders(prices, sizes);
        });
    }
    placeMultipleBuyOrders(prices, sizes) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.placeMultipleBuyOrders(prices, sizes);
            yield tx.wait();
            console.log("Multiple buy orders placed:", tx);
        });
    }
    placeMultipleSellOrders(prices, sizes) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.placeMultipleSellOrders(prices, sizes);
            yield tx.wait();
            console.log("Multiple sell orders placed:", tx);
        });
    }
    cancelOrders(orderIds, isBuy) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.batchCancelOrders(orderIds, isBuy);
            yield tx.wait();
            console.log("Batch orders cancelled:", tx);
        });
    }
    replaceOrders(orderIds, prices) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.replaceOrders(orderIds, prices);
            yield tx.wait();
            console.log("Orders replaced:", tx);
        });
    }
    placeAndExecuteMarketBuy(orderIds, size, isFillOrKill) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.placeAndExecuteMarketBuy(orderIds, size, isFillOrKill);
            yield tx.wait();
            console.log("Market buy order executed:", tx);
            return tx.value; // Assuming the function returns the remaining size
        });
    }
    placeAndExecuteMarketSell(orderIds, size, isFillOrKill) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.placeAndExecuteMarketSell(orderIds, size, isFillOrKill);
            yield tx.wait();
            console.log("Market sell order executed:", tx);
            return tx.value; // Assuming the function returns the remaining size
        });
    }
    placeAggressiveLimitSell(orderIds, size, price) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.placeAggressiveLimitSell(orderIds, size, price);
            yield tx.wait();
            console.log("Aggressive limit sell order placed:", tx);
        });
    }
    placeAggressiveLimitBuy(orderIds, size, price) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.orderbook.placeAggressiveLimitBuy(orderIds, size, price);
            yield tx.wait();
            console.log("Aggressive limit buy order placed:", tx);
        });
    }
}
exports.default = OrderbookClient;
