import { ethers } from 'ethers';
import { Pool } from 'pg';

export interface Order {
    order_id: number,
    owner_address: string;
    price: number;
    size: number;
    acceptable_range: number;
    is_buy: boolean;
}

export interface PricePoint {
    totalCompletedOrCanceledOrders: number;
    totalOrdersAtPrice: number;
    executableSize: number;
}

class OrderBookService {
    private db: Pool;

    constructor(dbConfig: any) {

        this.db = new Pool(dbConfig);
    }

    /**
     * Fetches all orders from the orderbook.
     * @returns {Promise<Order[]>} A promise that resolves to an array of Order objects.
     */
    async getOrders(): Promise<Order[]> {
        try {
            const res = await this.db.query(`SELECT * FROM orderbook`);
            return res.rows;
        } catch (error) {
            console.error(`Error fetching data from orders:`, error);
            throw error;
        }
    }

    /**
     * Fetches all buy orders from the orderbook.
     * @returns {Promise<Order[]>} A promise that resolves to an array of buy Order objects.
     */
    async getBuyOrders(): Promise<Order[]> {
        try {
            const res = await this.db.query(`SELECT * FROM orderbook WHERE is_buy=true`);
            return res.rows;
        } catch (error) {
            console.error(`Error fetching data from orders:`, error);
            throw error;
        }
    }

    /**
     * Fetches all sell orders from the orderbook.
     * @returns {Promise<Order[]>} A promise that resolves to an array of sell Order objects.
     */
    async getSellOrders(): Promise<Order[]> {
        try {
            const res = await this.db.query(`SELECT * FROM orderbook WHERE is_buy=false`);
            return res.rows;
        } catch (error) {
            console.error(`Error fetching data from orders:`, error);
            throw error;
        }
    }

    /**
     * Fetches orders for a specific user.
     * @param {string} ownerAddress - The address of the order owner.
     * @returns {Promise<Order[]>} A promise that resolves to an array of Order objects owned by the specified user.
     */
    async getOrderForUser(ownerAddress: string): Promise<Order[]> {
        try {
            const query = `SELECT * FROM orderbook WHERE owner_address = $1`;
            const res = await this.db.query(query, [ownerAddress]);
            return res.rows;
        } catch (error) {
            console.error(`Error fetching data for user ${ownerAddress}:`, error);
            throw error;
        }
    }

    /**
     * Fetches a specific order by its ID.
     * @param {number} orderId - The ID of the order to fetch.
     * @returns {Promise<Order | null>} A promise that resolves to the Order object if found, or null otherwise.
     */
    async getOrder(orderId: number): Promise<Order | null> {
        try {
            const query = `SELECT * FROM orderbook WHERE order_id = $1`;
            const res = await this.db.query(query, [orderId]);
            if (res.rows.length === 0) {
                return null;
            }
            return res.rows[0];
        } catch (error) {
            console.error(`Error fetching order with ID ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Fetches the Level 3 order book, including detailed order information.
     * @returns {Promise<any>} A promise that resolves to the Level 3 order book.
     */
    async getL3OrderBook(): Promise<any> {
        const orders: Order[] = await this.getOrders();
    
        const orderBook = {
            buyOrders: new Map<number, Order[]>(),
            sellOrders: new Map<number, Order[]>()
        };
    
        const addOrder = (order: Order, orderMap: Map<number, Order[]>) => {
            if (!orderMap.has(order.price)) {
                orderMap.set(order.price, []);
            }
            orderMap.get(order.price)?.push(order);
        };
    
        const sortOrdersByRange = (ordersList: Order[]) => {
            ordersList.sort((a, b) => a.acceptable_range - b.acceptable_range);
        };
    
        orders.forEach(order => {
            const targetMap = order.is_buy ? orderBook.buyOrders : orderBook.sellOrders;
            addOrder(order, targetMap);
        });
    
        orderBook.buyOrders.forEach(sortOrdersByRange);
        orderBook.sellOrders.forEach(sortOrdersByRange);
    
        // Sort buy and sell orders in descending order of price
        const sortMapDescendingByPrice = (map: Map<number, Order[]>) => {
            return new Map([...map.entries()].sort((a, b) => b[0] - a[0]));
        };
    
        return {
            buyOrders: sortMapDescendingByPrice(orderBook.buyOrders),
            sellOrders: sortMapDescendingByPrice(orderBook.sellOrders)
        };
    }    

    /**
     * Fetches the Level 2 order book, including aggregated order sizes by price point.
     * @returns {Promise<any>} A promise that resolves to the Level 2 order book.
     */
    async getL2OrderBook(): Promise<any> {
        const orders: Order[] = await this.getOrders();
    
        const buys = new Map<number, number>();
        const sells = new Map<number, number>();
    
        orders.forEach(order => {
            const orderMap = order.is_buy ? buys : sells;
            const currentSize = orderMap.get(order.price) || 0;
            // Ensure numerical addition
            orderMap.set(order.price, currentSize + Number(order.size));
        });
    
        // Function to sort map entries by price in descending order
        const sortMapDescending = (map: Map<number, number>) => {
            return Array.from(map).sort((a, b) => b[0] - a[0]);
        };
    
        return {
            buyOrders: sortMapDescending(buys),
            sellOrders: sortMapDescending(sells),
        };
    }

    /**
     * Checks if an order is active.
     * @param {number} orderId - The ID of the order to check.
     * @returns {Promise<boolean>} A promise that resolves to true if the order is active, false otherwise.
     */
    async isOrderActive(orderId: number): Promise<boolean> {
        const order: Order | null = await this.getOrder(orderId);

        return order != null;
    }

    /**
     * Fetches a list of buy order IDs that meet a target size and buffer percent criteria.
     * This method is used for providing order ids against which a market order would want to execute.
     * @param {number} size - The target size of orders to accumulate.
     * @param {number} bufferPercent - The buffer percentage to apply to the target size.
     * @returns {Promise<number[]>} A promise that resolves to an array of buy order IDs.
     */
    async getBuyOrdersForSize(size: number, bufferPercent: number): Promise<number[]> {
        const orders = await this.getBuyOrders(); // Fetch only buy orders
        const targetSize = size + (bufferPercent / 100) * size;
        let accumulatedSize: number = 0;
        let orderIds = [];
    
        // Sort buy orders by price (ascending), then by acceptable range (ascending)
        const sortedBuyOrders = orders.sort((a, b) => {
            return a.price === b.price ? a.acceptable_range - b.acceptable_range : b.price - a.price;
        });
    
        for (const order of sortedBuyOrders) {
            if (accumulatedSize >= targetSize) break;
            accumulatedSize += Number(order.size);
            orderIds.push(order.order_id);
        }
    
        return orderIds;
    }

     /**
     * Fetches a list of sell order IDs that meet a target size and buffer percent criteria.
     * This method is used for providing order ids against which a market order would want to execute.
     * @param {number} size - The target size of orders to accumulate.
     * @param {number} bufferPercent - The buffer percentage to apply to the target size.
     * @returns {Promise<number[]>} A promise that resolves to an array of sell order IDs.
     */
    async getSellOrdersForSize(size: number, bufferPercent: number): Promise<number[]> {
        const orders = await this.getSellOrders(); // Fetch only sell orders
        const targetSize = size + (bufferPercent / 100) * size;
        let accumulatedSize = 0;
        let orderIds = [];
    
        // Sort sell orders by price (descending), then by acceptable range (ascending)
        const sortedSellOrders = orders.sort((a, b) => {
            return a.price === b.price ? a.acceptable_range - b.acceptable_range : a.price - b.price;
        });
    
        for (const order of sortedSellOrders) {
            if (accumulatedSize >= targetSize) break;
            accumulatedSize += order.size;
            orderIds.push(order.order_id);
        }
    
        return orderIds;
    }    
}

export default OrderBookService;
