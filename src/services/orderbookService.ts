import { Pool } from 'pg';
import { Order } from '../types/types';

class OrderBookService {
    private db: Pool;
    private marketAddress: string;

    constructor(marketAddress:string, dbConfig: any) {
        this.marketAddress = marketAddress;
        this.db = new Pool(dbConfig);
    }

    /**
     * Fetches all orders from the orderbook.
     * @returns {Promise<Order[]>} A promise that resolves to an array of Order objects.
     */
    async getOrders(): Promise<Order[]> {
        try {
            const res = await this.db.query(`SELECT * FROM orderbook_${this.marketAddress}`);
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
            const res = await this.db.query(`SELECT * FROM orderbook_${this.marketAddress} WHERE is_buy=true`);
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
            const res = await this.db.query(`SELECT * FROM orderbook_${this.marketAddress} WHERE is_buy=false`);
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
            const query = `SELECT * FROM orderbook_${this.marketAddress} WHERE owner_address = $1`;
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
            const query = `SELECT * FROM orderbook_${this.marketAddress} WHERE order_id = $1`;
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
            ordersList.sort((a, b) => a.order_id - b.order_id);
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
    
        const buys: { price: number; quantity: number }[] = [];
        const sells: { price: number; quantity: number }[] = [];
    
        orders.forEach(order => {
            const targetList = order.is_buy ? buys : sells;
            const found = targetList.find(o => o.price === order.price);
            if (found) {
                found.quantity += Number(order.size);
            } else {
                targetList.push({ price: order.price, quantity: Number(order.size) });
            }
        });
    
        // Function to sort arrays by price in descending order
        const sortArrayDescending = (array: { price: number; quantity: number }[]) => {
            return array.sort((a, b) => b.price - a.price);
        };
    
        return {
            sellOrders: sortArrayDescending(sells),
            buyOrders: sortArrayDescending(buys),
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
    async getAvgBuyPriceForSize(size: number): Promise<number> {
        const orders = await this.getBuyOrders(); // Fetch only buy orders

        // Sort buy orders by price (ascending), then by order Id (ascending)
        const sortedBuyOrders = orders.sort((a, b) => {
            return a.price === b.price ? a.order_id - b.order_id : b.price - a.price;
        });

        let accumulatedSize: number = 0;
        let totalPrice: number = 0;

        for (const order of sortedBuyOrders) {
            if (accumulatedSize >= size) break;
            accumulatedSize += Number(order.size);
            totalPrice += order.price;
        }

        return totalPrice/size;
    }
}

export default OrderBookService;
