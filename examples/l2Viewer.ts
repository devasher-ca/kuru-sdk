import * as KuruSdk from "../src";

export interface OrderBookData {
    asks: Record<string, string>;
    bids: Record<string, string>;
    blockNumber: number;
}

const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const rpcUrl = "http://localhost:8545";
const contractAddress = "0xE9426DA3c9D65e52a28652eb24461d5561F12949";

class OrderbookWatcher {
    private clientSdk: KuruSdk.OrderbookClient;
    private lastOrderbookJson: string | null = null;

    constructor(clientSdk: KuruSdk.OrderbookClient) {
        this.clientSdk = clientSdk;
    }

    static async create(privateKey: string, rpcUrl: string, contractAddress: string): Promise<OrderbookWatcher> {
        const clientSdk = await KuruSdk.OrderbookClient.create(privateKey, rpcUrl, contractAddress);
        return new OrderbookWatcher(clientSdk);
    }

    public startWatching(intervalMs: number = 500): void {
        setInterval(async () => {
            try {
                const currentOrderbook = await this.clientSdk.getL2OrderBook();
                const currentOrderbookJson = JSON.stringify(currentOrderbook, null, 4); // 4-space indentation for pretty printing
                if (this.lastOrderbookJson !== currentOrderbookJson) {
                    const asksArray = Object.entries(currentOrderbook.asks).map(([price, quantity]) => ({ price: parseFloat(price), quantity: parseFloat(quantity) }));
                    const bidsArray = Object.entries(currentOrderbook.bids).map(([price, quantity]) => ({ price: parseFloat(price), quantity: parseFloat(quantity) }));

                    const maxBaseSize = Math.max(
                        ...asksArray.map(a => a.quantity),
                        ...bidsArray.map(b => b.quantity)
                    );
                    const maxBaseSizeLength = maxBaseSize.toString().length;
                    const printLine = (price: number, size: number, color: "red" | "green") => {
                        const priceStr = price.toFixed(2); // Assuming two decimal places for price
                        const sizeStr = size.toString().padStart(maxBaseSizeLength, " ");
                        console.log(
                          priceStr + " " + `\u001b[3${color === "green" ? 2 : 1}m` + sizeStr + "\u001b[0m"
                        );
                    };

                    console.clear();
                    console.log("=================================");
                    console.log("Asks");
                    console.log("=================================");
                    asksArray.forEach(({ price, quantity }) => {
                        if (quantity != 0) {
                            printLine(price, quantity, "red");
                        }
                    });

                    console.log("=================================");
                    console.log("Bids");
                    console.log("=================================");
                    bidsArray.forEach(({ price, quantity }) => {
                        if (quantity != 0) {
                            printLine(price, quantity, "green");
                        }
                    });

                    this.lastOrderbookJson = currentOrderbookJson;
                }
            } catch (error) {
                console.error('Failed to fetch or process L2 Orderbook:', error);
            }
        }, intervalMs);
    }
}

(async () => {
    const watcher = await OrderbookWatcher.create(privateKey, rpcUrl, contractAddress);
    watcher.startWatching(); // Default polling interval set to 500 milliseconds
})();
