import { ethers } from 'ethers';

export interface Order {
    ownerAddress: string;
    price: number;
    size: number;
    acceptableRange: number;
    isBuy: boolean;
}

export interface PricePoint {
    totalCompletedOrCanceledOrders: number;
    totalOrdersAtPrice: number;
    executableSize: number;
}

class OrderBookService {
    private contract: ethers.Contract;

    constructor(privateKey: string, rpcUrl: string, contractAddress: string, contractABI: any) {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        this.contract = new ethers.Contract(contractAddress, contractABI, wallet);
    }

    async getBuyPricePoints(): Promise<Map<number, PricePoint>> {
        // TODO: use graphql query to get all price point keys
        const buyPricePointsKeys: number[] = await this.contract.getBuyPricePointsKeys();
        const buyPricePoints = new Map<number, PricePoint>();
    
        for (const key of buyPricePointsKeys) {
            const point: PricePoint = await this.contract.buyPricePoints(key);
            buyPricePoints.set(key, {
                totalCompletedOrCanceledOrders: point.totalCompletedOrCanceledOrders,
                totalOrdersAtPrice: point.totalOrdersAtPrice,
                executableSize: point.executableSize,
            });
        }
    
        return buyPricePoints;
    }
    
    async getSellPricePoints(): Promise<Map<number, PricePoint>> {
        // TODO: use graphql query to get all price point keys
        const sellPricePointsKeys: number[] = await this.contract.getSellPricePointsKeys();
        const sellPricePoints = new Map<number, PricePoint>();
    
        for (const key of sellPricePointsKeys) {
            const point: PricePoint = await this.contract.sellPricePoints(key);
            sellPricePoints.set(key, {
                totalCompletedOrCanceledOrders: point.totalCompletedOrCanceledOrders,
                totalOrdersAtPrice: point.totalOrdersAtPrice,
                executableSize: point.executableSize,
            });
        }
    
        return sellPricePoints;
    }
    

    async getOrders(): Promise<Order[]> {
        // Assuming the contract has a method to fetch all orders
        const orders: Order[] = await this.contract.getOrders();
        return orders.map((order: Order) => ({
            ownerAddress: order.ownerAddress,
            price: order.price,
            size: order.size,
            acceptableRange: order.acceptableRange,
            isBuy: order.isBuy,
        }));
    }

    async getOrderBook(): Promise<any> {
        const buyPricePointsMap = await this.getBuyPricePoints();
        const sellPricePointsMap = await this.getSellPricePoints();
        const orders = await this.getOrders();
    
        const buyPricePoints = Array.from(buyPricePointsMap.entries())
            .filter(([price, point]) => point.totalCompletedOrCanceledOrders < point.totalOrdersAtPrice)
            .sort((a, b) => a[0] - b[0])
            .map(([price, point]) => ({ price, ...point }));
    
        const sellPricePoints = Array.from(sellPricePointsMap.entries())
            .filter(([price, point]) => point.totalCompletedOrCanceledOrders < point.totalOrdersAtPrice)
            .sort((a, b) => a[0] - b[0])
            .map(([price, point]) => ({ price, ...point }));
    
        const buyOrderMap = new Map<number, Order[]>();
        const sellOrderMap = new Map<number, Order[]>();
    
        orders.forEach(order => {
            if (order.isBuy ? !buyOrderMap.has(order.price) : !sellOrderMap.has(order.price)) {
                order.isBuy ? buyOrderMap.set(order.price, []) : sellOrderMap.set(order.price, []);
            }
            order.isBuy ? buyOrderMap.get(order.price)?.push(order) : sellOrderMap.get(order.price)?.push(order);
        });
    
        buyOrderMap.forEach((ordersList, price) => {
            ordersList.sort((a, b) => a.acceptableRange - b.acceptableRange);
        });

        sellOrderMap.forEach((ordersList, price) => {
            ordersList.sort((a, b) => a.acceptableRange - b.acceptableRange);
        });
    
        return {
            buy: buyPricePoints,
            sell: sellPricePoints,
            buyOrders: buyOrderMap,
            sellOrders: sellOrderMap,
        };
    }
}

export default OrderBookService;
