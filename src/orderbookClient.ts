import { ethers } from 'ethers';
import { Contract } from 'ethers';

class OrderbookClient {
    private provider: ethers.JsonRpcProvider;
    private wallet: ethers.Wallet;
    private orderbook: Contract;

    constructor(privateKey: string, rpcUrl: string, orderbookAddress: string, orderbookABI: any) {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.orderbook = new ethers.Contract(orderbookAddress, orderbookABI, this.wallet);
    }

    async addBuyOrder(price: number, size: number): Promise<void> {
        const tx = await this.orderbook.addBuyOrder(price, size);
        await tx.wait();
        console.log('Buy order added:', tx);
    }

    async addSellOrder(price: number, size: number): Promise<void> {
        const tx = await this.orderbook.addSellOrder(price, size);
        await tx.wait();
        console.log('Sell order added:', tx);
    }

    async cancelSellOrder(orderId: number): Promise<void> {
        const tx = await this.orderbook.cancelSellOrder(orderId);
        await tx.wait();
        console.log('Sell order cancelled:', tx);
    }

    async cancelBuyOrder(orderId: number): Promise<void> {
        const tx = await this.orderbook.cancelBuyOrder(orderId);
        await tx.wait();
        console.log('Buy order cancelled:', tx);
    }

    async placeMultipleBuyOrders(prices: number[], sizes: number[]): Promise<void> {
        const tx = await this.orderbook.placeMultipleBuyOrders(prices, sizes);
        await tx.wait();
        console.log('Multiple buy orders placed:', tx);
    }

    async placeMultipleSellOrders(prices: number[], sizes: number[]): Promise<void> {
        const tx = await this.orderbook.placeMultipleSellOrders(prices, sizes);
        await tx.wait();
        console.log('Multiple sell orders placed:', tx);
    }

    async batchCancelOrders(orderIds: number[], isBuy: boolean[]): Promise<void> {
        const tx = await this.orderbook.batchCancelOrders(orderIds, isBuy);
        await tx.wait();
        console.log('Batch orders cancelled:', tx);
    }

    async replaceOrders(orderIds: number[], prices: number[]): Promise<void> {
        const tx = await this.orderbook.replaceOrders(orderIds, prices);
        await tx.wait();
        console.log('Orders replaced:', tx);
    }

    async placeAndExecuteMarketBuy(orderIds: number[], size: number, isFillOrKill: boolean): Promise<number> {
        const tx = await this.orderbook.placeAndExecuteMarketBuy(orderIds, size, isFillOrKill);
        await tx.wait();
        console.log('Market buy order executed:', tx);
        return tx.value; // Assuming the function returns the remaining size
    }

    async placeAndExecuteMarketSell(orderIds: number[], size: number, isFillOrKill: boolean): Promise<number> {
        const tx = await this.orderbook.placeAndExecuteMarketSell(orderIds, size, isFillOrKill);
        await tx.wait();
        console.log('Market sell order executed:', tx);
        return tx.value; // Assuming the function returns the remaining size
    }

    async placeAggressiveLimitSell(orderIds: number[], size: number, price: number): Promise<void> {
        const tx = await this.orderbook.placeAggressiveLimitSell(orderIds, size, price);
        await tx.wait();
        console.log('Aggressive limit sell order placed:', tx);
    }

    async placeAggressiveLimitBuy(orderIds: number[], size: number, price: number): Promise<void> {
        const tx = await this.orderbook.placeAggressiveLimitBuy(orderIds, size, price);
        await tx.wait();
        console.log('Aggressive limit buy order placed:', tx);
    }

}

export default OrderbookClient;
