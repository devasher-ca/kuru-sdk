import { Pool } from 'pg';
import { Order } from '../types/types';

class OrderService {
    private db: Pool;

    constructor(dbConfig: any) {

        this.db = new Pool(dbConfig);
    }

    /**
     * Fetches all historic orders for an address.
     * @returns {Promise<Order[]>} A promise that resolves to an array of Order objects.
     */
    async getOrdersForAddress(ownerAddress: string): Promise<Order[]> {
        try {
            const res = await this.db.query(`SELECT * FROM orders WHERE owner_address = $1`, [ownerAddress]);
            return res.rows;
        } catch (error) {
            console.error(`Error fetching data from orders:`, error);
            throw error;
        }
    }
}

export default OrderService;
