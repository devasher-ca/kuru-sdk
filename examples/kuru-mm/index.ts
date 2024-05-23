import * as KuruSdk from "../../src";

import {
    Config,
    Spread,
    MarketSettings
} from './models'

let MARKET = process.argv[2].toLowerCase()

const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const rpcUrl = "http://localhost:8545";
const contractAddress = "0xBffBa2d75440205dE93655eaa185c12D52d42D10";

// Edge in cents on $. Places bid/ask at fair price -/+ edge
const QUOTE_EDGE = 0.05;

const config: Config = {
    "sizeupperlimit": 2,
    "sizelowerlimit": 0.7,
    "mindelay": 5,
    "maxdelay": 20
};

// Zero buy-no-sell counter (used to detect if we are on a market dive)
// we are creating this variable here at top level just so that we can use inside helper functions
let edgeCounter = 0
let buyingCounter = 0
async function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

function random(min: number, max: number) {
    return Math.random() * (max - min) + min
}

async function getassetprice(): Promise<Spread> {
    try {
        const price = await fetch("https://api.coinbase.com/v2/prices/SOL-USD/spot")
			.then((response) => response.json())
			.then((data) => {
				return data.data.amount;
			})
			.catch((error) => console.error(error));
		console.log("price", price);
		const bid = Math.round(parseFloat(price) * 100) / 100 - QUOTE_EDGE;
		const ask = Math.round(parseFloat(price) * 100) / 100 + QUOTE_EDGE;

        return {bid, ask};
    } catch (error) {
        throw Error('[Error!] fetchting external gold price')
    }
}

async function getInitialOrderBook(client: KuruSdk.OrderbookClient): Promise<KuruSdk.OrderBookData> {
    return client.getL2OrderBook()
}

async function edgeTrade(client: KuruSdk.OrderbookClient, trade: KuruSdk.TradeEvent, matchedOrder: KuruSdk.Order, mkt: MarketSettings): Promise<void> {

    if (matchedOrder.isBuy) {
    //!TODO add here the complex call for the logic that extimates the proper sell price
    // this implementation just adds the market tick, making 1 tick profit.
    const sellprice = (matchedOrder.price / mkt.priceprecision).toFixed(mkt.pricedecimals);
    const sellsize = (matchedOrder.size / mkt.sizeprecision).toFixed(mkt.sizedecimals);
    console.log('[INFO]: placing-sell to edge buy made');
    client.placeLimit(parseFloat(sellprice), parseFloat(sellsize), false, true).then((placeOrder) => {
        if (!placeOrder) {
            const sellPrice = (
                parseFloat(sellprice) * 1.0025 +
                mkt.tick
            ).toFixed(mkt.pricedecimals);

            client.placeLimit(parseFloat(sellprice), parseFloat(sellsize), false, true).then(() => {
                ++edgeCounter;
                console.log(`++edgeCounter (placing edge) ${edgeCounter}`);
            })
            .catch(error => {
                console.log(error);
            });
        } else {
            ++edgeCounter;
            console.log(`++edgeCounter (placing edge) ${edgeCounter}`);
        }
    }).catch(error => {
        console.log(error);
    });;
    // Buy order filled
    --buyingCounter;
    console.log(`--buyingCounter (buy filled) ${buyingCounter}`);
    } else {
    --edgeCounter;
    console.log(`buyingCounter ${buyingCounter}`);
    console.log(`--edgeCounter (sell edge filled) ${edgeCounter}`);
    }
};

function computebuyprice(spread: Spread, ob: KuruSdk.OrderBookData, mkt: MarketSettings) {
    let bidstip = -Infinity
    for (const price of Object.keys(ob.bids)) {
        bidstip = (bidstip < parseFloat(price)) ? parseFloat(price) : bidstip;
    }

    let askstip = +Infinity
    for (const price of Object.keys(ob.asks)) {
        askstip = (askstip > parseFloat(price)) ? parseFloat(price) : askstip;
    }

    const almostbid = bidstip + mkt.tick < askstip ? bidstip + mkt.tick : bidstip

    // Global best buy offer, Nash + Market, always improve the world ;)
    // This will make sure prices are in line with global markets and at orderbook tip
    let buyprice = spread.bid.toFixed(mkt.pricedecimals)
    if (isFinite(almostbid)) {
        buyprice = (spread.bid > askstip ? almostbid : Math.max(almostbid, spread.bid)).toFixed(mkt.pricedecimals)
    }
    return buyprice
}

async function cancelAllBuys(client: KuruSdk.OrderbookClient) {
    client.cancelAllBuys(userAddress)
}

function configureConnection(listener: KuruSdk.MarketListener, client: KuruSdk.OrderbookClient, mkt: MarketSettings) {
    // Set function to update orderbook view
    listener.listenForOrders((order: KuruSdk.OrderEvent) => {
        getInitialOrderBook(client).then(res => currentOB = res);
    });

    // Set function to monitor trades
    listener.listenForTrades((trade: KuruSdk.TradeEvent) => {
        getInitialOrderBook(client).then(res => currentOB = res);
        client.getOrder(trade.orderId).then((order) => {
            edgeTrade(client, trade, order, mkt)
        })
        
    });
}

let currentOB: KuruSdk.OrderBookData;

const run = async () => {
    const client = await KuruSdk.OrderbookClient.create(privateKey, rpcUrl, contractAddress);
    const listener = new KuruSdk.MarketListener(rpcUrl, contractAddress);

    const marketParams: KuruSdk.MarketParams = client.getMarketParams();

    // Compute market settings to configure prices and sizes for orders
    const mktsettings: MarketSettings = {
        tick: 1/marketParams.pricePrecision,
        priceprecision: marketParams.pricePrecision,
        sizeprecision: marketParams.sizePrecision,
        pricedecimals: Math.abs(Math.round(Math.log10(marketParams.pricePrecision))),
        sizedecimals: Math.abs(Math.round(Math.log10(marketParams.sizePrecision))),
    }

    // First cancel all buy orders in the market on initialization
    await cancelAllBuys(client);

    // Initially set to disconnected to force it to connect on first iteration
    let isDisconnected = true
    let buyprice: string

    // Play ping-pong! =)
    while (true) {

        // Give some time if market is going down so we don't lock all the funds in future sells
        // time to wait is 15 sec * (2 ^ number of sells without buys)
        if (edgeCounter >= 1) {
            console.log('[INFO]: market seens to not be buying, giving more time to match sells')
            let timeToWait = 15_000 * (Math.pow(2, edgeCounter))
            console.log(`[INFO]: will wait for ${(timeToWait/60_000).toFixed()}min`)
            // await cancelAllBuys()
            // buyingCounter = 0
            // console.log('buyingCounter ' + buyingCounter)
            // console.log('edgeCounter ' + edgeCounter)
            await delay(timeToWait)
        }

        // Check if we are connected, if not try to reconnect
        // After the big delay from dip detection above because delays can cause disconnections
        if (isDisconnected) {
            console.log('[WARNING]: disconnection detected, reconnecting to Nash')

            currentOB = await getInitialOrderBook(client)
            configureConnection(listener, client, mktsettings);
            isDisconnected = false
            // TODO: Re initialize event listener. Must be the best place to handle it.
            await delay(300)
            if (isDisconnected) {
                console.log('[ERROR] Could not connect to Nash exchange! Re-trying in 30 seconds')
                await delay(30_000)
                continue
            }
        }

        // If there is no current buying order, and not too much pending sells... we rebuy
        if (buyingCounter === 0 && edgeCounter <= 1) {
            // Compute a leading price that is consistent with global markets, present here to devs our
            // endpoint with real-time global markets data =)
            let spread = await getassetprice()
            // Place buy order at  best price and random size
            buyprice = computebuyprice(spread, currentOB!, mktsettings)
            // Do a random size just for LOLz - one can compute ideal size from imbalance
            // this size here is just for template, reminder: need to give training on trading for community
            let buysize = random(config.sizelowerlimit, config.sizeupperlimit).toFixed(mktsettings.sizedecimals)

            console.log('[INFO]: placing buy order at price: ', buyprice)
            try {
                await client.placeLimit(
                    parseFloat(buyprice),
                    parseFloat(buysize),
                    true,
                    true
                );
            } catch (e) {
                console.log(e);
                return;
            }
            // Increment buy-no-sell counter so we can detect the market taking dives
            // this is a simple strategy to not keep buying as the market goes down
            // one can (maybe should?) get a lot more fancy - but this works 80/20
            console.log('++buyingCounter ' + buyingCounter)
            console.log('edgeCounter ' + edgeCounter)
        }

        // Check if is price tip, if it is not cancel current buy
        let bidstip = -Infinity
        for (const price of Object.keys(currentOB!.bids)) {
            bidstip = (bidstip < parseFloat(price)) ? parseFloat(price) : bidstip;
        }

        if (isFinite(bidstip) && parseFloat(buyprice!) < bidstip) {
            console.log('[WARNING]: Not tip anymore, canceling current buy')
            await cancelAllBuys(client)
            buyingCounter = 0
            console.log('buyingCounter ' + buyingCounter)
            console.log('edgeCounter ' + edgeCounter)
        }

        // Give some time for market to fill order
        await delay(random(config.mindelay, config.maxdelay) * 1_000)
    }
}

run()
