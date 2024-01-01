import { ethers } from 'ethers';
import { Pool } from 'pg';

class OrderStorageService {
    private contract: ethers.Contract;
    private db: Pool;

    constructor(rpcUrl: string, contractAddress: string, contractABI: any, dbConfig: any) {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        this.contract = new ethers.Contract(contractAddress, contractABI, provider);

        // Initialize the database connection
        this.db = new Pool(dbConfig);
    }

    async saveOrder(orderId: number, ownerAddress: string, price: number, size: number, acceptableRange: number, isBuy: boolean) {
        const query = `
            INSERT INTO orders (order_id, owner_address, price, size, acceptable_range, is_buy)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (order_id) DO UPDATE
            SET owner_address = EXCLUDED.owner_address, price = EXCLUDED.price, size = EXCLUDED.size, acceptable_range = EXCLUDED.acceptable_range, is_buy = EXCLUDED.is_buy;
        `;

        await this.db.query(query, [orderId, ownerAddress, price, size, acceptableRange, isBuy]);
    }

    async deleteOrder(orderId: number) {
        const query = `DELETE FROM orders WHERE order_id = $1;`;
        await this.db.query(query, [orderId]);
    }

    async listenForOrderEvents(): Promise<void> {
        this.contract.on('OrderCreated', async (orderId, ownerAddress, price, size, acceptableRange, isBuy) => {
            console.log(`OrderCreated event detected for orderId: ${orderId}`);
            await this.saveOrder(orderId, ownerAddress, price, size, acceptableRange, isBuy);
        });
        
        this.contract.on('OrderUpdated', async (orderId, ownerAddress, price, size, acceptableRange, isBuy) => {
            console.log(`OrderUpdated event detected for orderId: ${orderId}`);
            await this.saveOrder(orderId, ownerAddress, price, size, acceptableRange, isBuy);
        });
        
        this.contract.on('OrderCompletedOrCanceled', async (orderId) => {
            console.log(`OrderCompletedOrCanceled event detected for orderId: ${orderId}`);
            await this.deleteOrder(orderId);
        });
    }
}

export default OrderStorageService;
