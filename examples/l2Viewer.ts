import OrderbookService from '../src/services/orderbookService';

const marketAddress = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";

const dbConfig = {
    user: 'username',
    host: 'localhost', // or the database server's address
    database: 'orderbook',
    password: 'password',
    port: 5432,
};

const sdkService = new OrderbookService(marketAddress, dbConfig);

class OrderbookWatcher {
    private sdkService: OrderbookService;
    private lastOrderbookJson: string | null = null;

    constructor(sdkService: OrderbookService) {
        this.sdkService = sdkService;
    }

    public startWatching(intervalMs: number = 500): void {
        setInterval(async () => {
            try {
                const currentOrderbook = await this.sdkService.getL2OrderBook();
                const currentOrderbookJson = JSON.stringify(currentOrderbook, null, 4); // 4-space indentation for pretty printing
                if (this.lastOrderbookJson !== currentOrderbookJson) {
                    const maxBaseSize = Math.max(
                        ...currentOrderbook.buyOrders.map((b: { quantity: any; }) => b.quantity),
                        ...currentOrderbook.sellOrders.map((a: { quantity: any; }) => a.quantity)
                    );
                    const maxBaseSizeLength = maxBaseSize.toString().length;
                    const printLine = (price: number, size: number, color: "red" | "green") => {
                        const priceStr = price.toString();
                        const sizeStr = size.toString().padStart(maxBaseSizeLength, " ");
                        console.log(
                          priceStr + " " + `\u001b[3${color === "green" ? 2 : 1}m` + sizeStr + "\u001b[0m"
                        );
                    };

                    console.clear();
                    console.log("=================================");
                    console.log("Asks");
                    console.log("=================================");
                    for (const { price, quantity } of currentOrderbook.sellOrders) {
                        if (quantity != 0) {
                            printLine(price, quantity, "red");
                        }
                    }

                    // console.log(`\n`);
                    console.log("=================================");
                    console.log("Bids");
                    console.log("=================================");
                    for (const { price, quantity } of currentOrderbook.buyOrders) {
                        if (quantity != 0) {
                            printLine(price, quantity, "green");
                        }
                    }

                    this.lastOrderbookJson = currentOrderbookJson;
                }
            } catch (error) {
                console.error('Failed to fetch or process L2 Orderbook:', error);
            }
        }, intervalMs);
    }
}

const watcher = new OrderbookWatcher(sdkService);
watcher.startWatching(); // Default polling interval set to 500 milliseconds
