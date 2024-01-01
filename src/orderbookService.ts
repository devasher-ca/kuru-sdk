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
    
    async getOrders(): Promise<Order[]> {
        try {
            const res = await this.db.query(`SELECT * FROM orderbook`);
            return res.rows;
        } catch (error) {
            console.error(`Error fetching data from orders:`, error);
            throw error;
        }
    }

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
    
        return {
            buyOrders: Array.from(orderBook.buyOrders),
            sellOrders: Array.from(orderBook.sellOrders)
        };
    }
    

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

    async isOrderActive(orderId: number): Promise<boolean> {
        const order: Order | null = await this.getOrder(orderId);

        return order != null;
    }
}

export default OrderBookService;
