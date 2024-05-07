import { ethers } from "ethers";
import { Pool } from "pg";
import MarketListener from './marketsListener';
import routerAbi from '../../abi/Router.json';

class RouterListener {
    private contract: ethers.Contract;
    private dbConfig: any;
    private db: Pool;
    private rpcUrl: string;

    constructor(
        rpcUrl: string,
        contractAddress: string,
        dbConfig: any
    ) {
        this.rpcUrl = rpcUrl;
        this.dbConfig = dbConfig;
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        this.contract = new ethers.Contract(contractAddress, routerAbi.abi, provider);
        this.db = new Pool(dbConfig);
    }

    // Method to initialize listeners
    async initialize() {
        try {
            setInterval(() => {
                this.contract.on('MarketRegistered', async (baseAsset: string, quoteAsset: string, marketAddress: string, event: ethers.Log) => {
                    console.log(`Market registered: ${marketAddress} with base asset: ${baseAsset} and quote asset: ${quoteAsset}`);
        
                    // Create table for the new market
                    await this.createOrderbookTable(marketAddress);
                    await this.createOrdersTable(marketAddress);
                    await this.createTradesTable(marketAddress);
                    
                    // Start listening to other events specific to this market
                    const marketListener = new MarketListener(this.rpcUrl, marketAddress, this.dbConfig);
        
                    marketListener.listenForOrderEvents();
                });
            }, 500)
        } catch (err) {
            console.log(`Error listening to events on router contract ${err}`)
        }
    }

    // Create a table for the market
    private async createOrderbookTable(marketAddress: string) {
        const tableName = `orderbook_${marketAddress}`;
        const query = `
            CREATE TABLE IF NOT EXISTS ${tableName} (
                order_id SERIAL PRIMARY KEY,
                owner_address VARCHAR(255),
                size NUMERIC,
                price NUMERIC,
                is_buy BOOLEAN,
                is_updated BOOLEAN
            );
        `;

        try {
            await this.db.query(query);
            console.log(`Table created: ${tableName}`);
        } catch (error) {
            console.error(`Error creating orderbook table for market ${marketAddress}:`, error);
        }
    }

    private async createOrdersTable(marketAddress: string) {
        const tableName = `orders_${marketAddress}`;
        const query = `
            CREATE TABLE IF NOT EXISTS ${tableName} (
                order_id SERIAL PRIMARY KEY,
                owner_address VARCHAR(255),
                size NUMERIC,
                price NUMERIC,
                is_buy BOOLEAN,
                tx_hash VARCHAR(255)
            );
        `;

        try {
            await this.db.query(query);
            console.log(`Table created: ${tableName}`);
        } catch (error) {
            console.error(`Error creating orders table for market ${marketAddress}:`, error);
        }
    }

    private async createTradesTable(marketAddress: string) {
        const tableName = `trades_${marketAddress}`;
        const query = `
            CREATE TABLE IF NOT EXISTS ${tableName} (
                taker_address VARCHAR(255),
                order_id NUMERIC,
                size NUMERIC,
                tx_hash VARCHAR(255),
                timestamp NUMERIC
            );
        `;

        try {
            await this.db.query(query);
            console.log(`Table created: ${tableName}`);
        } catch (error) {
            console.error(`Error creating trades table for market ${marketAddress}:`, error);
        }
    }
}

export default RouterListener;
