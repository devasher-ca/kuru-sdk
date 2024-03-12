import { Pool } from 'pg';
import { Order } from '../types/types';

class TradeService {
    private db: Pool;

    constructor(dbConfig: any) {

        this.db = new Pool(dbConfig);
    }

    /**
     * Fetches all historic trades for an address.
     * @returns {Promise<Order[]>} A promise that resolves to an array of Order objects.
     */
    async getTradesForAddress(ownerAddress: string): Promise<Order[]> {
        try {
            const res = await this.db.query(`SELECT * FROM trades WHERE owner_address = $1`, [ownerAddress]);
            return res.rows;
        } catch (error) {
            console.error(`Error fetching data from orders:`, error);
            throw error;
        }
    }
}

export default TradeService;
