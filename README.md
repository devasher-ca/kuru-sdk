# Kuru SDK Documentation

The `@kuru-labs/kuru-sdk` provides various functionalities for interacting with the Kuru protocol. Below are examples of how to use the SDK for different operations.

## Installation

```bash
npm install @kuru-labs/kuru-sdk
```

## Configuration

Ensure you have a configuration file (`config.json`) with the necessary details such as `rpcUrl`, `contractAddress`, etc.

Example `config.json`:

```json
{
    "rpcUrl": "https://your-rpc-url",
    "contractAddress": "your-contract-address",
    "marginAccountAddress": "your-margin-account-address",
    "baseTokenAddress": "your-base-token-address",
    "quoteTokenAddress": "your-quote-token-address",
    "routerAddress": "your-router-address",
    "userAddress": "your-user-address"
}
```

Ensure you export your private key to use the examples
```bash
export PRIVATE_KEY=<0xpvt_key>
```

## Example Usage

### Cancel Order

To cancel orders using the Kuru SDK:

```typescript
import { ethers, BigNumber } from "ethers";
import * as KuruSdk from "@kuru-labs/kuru-sdk";
import * as KuruConfig from "./config.json";

const { rpcUrl, contractAddress } = KuruConfig;
const privateKey = process.env.PRIVATE_KEY as string;

const args = process.argv.slice(2);

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    await KuruSdk.OrderCanceler.cancelOrders(
        signer,
        contractAddress,
        args.map(arg => BigNumber.from(parseInt(arg)))
    );
})();
```

### Deposit

To deposit tokens into a margin account:

```typescript
import { ethers } from "ethers";
import * as KuruSdk from "@kuru-labs/kuru-sdk";
import * as KuruConfig from "./config.json";

const { userAddress, rpcUrl, marginAccountAddress, baseTokenAddress, quoteTokenAddress } = KuruConfig;
const privateKey = process.env.PRIVATE_KEY as string;

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    await KuruSdk.MarginDeposit.deposit(
        signer,
        marginAccountAddress,
        userAddress,
        baseTokenAddress,
        100000,
        18
    );

    await KuruSdk.MarginDeposit.deposit(
        signer,
        marginAccountAddress,
        userAddress,
        quoteTokenAddress,
        100000,
        18
    );
})();
```

### Estimate Base for Sell

To estimate the required base for a sell operation:

```typescript
import { ethers } from "ethers";
import * as KuruSdk from "@kuru-labs/kuru-sdk";
import * as KuruConfig from "./config.json";

const { rpcUrl, contractAddress } = KuruConfig;
const args = process.argv.slice(2);
const amount = parseFloat(args[0]);

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, contractAddress);

    const estimate = await KuruSdk.CostEstimator.estimateRequiredBaseForSell(
        provider,
        contractAddress,
        marketParams,
        amount
    );

    console.log(`Estimated required base: ${estimate}`);
})();
```

### Estimate Buy

To estimate the buy amount:

```typescript
import { ethers } from "ethers";
import * as KuruSdk from "@kuru-labs/kuru-sdk";
import * as KuruConfig from "./config.json";

const { rpcUrl, contractAddress } = KuruConfig;
const args = process.argv.slice(2);
const size = parseFloat(args[0]);

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, contractAddress);

    const estimate = await KuruSdk.CostEstimator.estimateBuy(
        provider,
        contractAddress,
        marketParams,
        size
    );

    console.log(`Estimated buy: ${estimate}`);
})();
```

### Find Best Path

To find the best path for a swap:

```typescript
import { ethers } from "ethers";
import * as KuruSdk from "@kuru-labs/kuru-sdk";
import * as KuruConfig from "./config.json";

const { rpcUrl, baseTokenAddress, quoteTokenAddress } = KuruConfig;
const size = parseFloat(process.argv[2]);

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    const bestPath = await KuruSdk.PathFinder.findBestPath(
        provider,
        baseTokenAddress,
        quoteTokenAddress,
        size
    );

    console.log(`Best path: ${bestPath}`);
})();
```

### Market Buy

To perform a market buy:

```typescript
import { ethers } from "ethers";
import * as KuruSdk from "@kuru-labs/kuru-sdk";
import * as KuruConfig from "./config.json";

const { rpcUrl, contractAddress } = KuruConfig;
const privateKey = process.env.PRIVATE_KEY as string;
const size = parseFloat(process.argv[2]);

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, contractAddress);

    await KuruSdk.IOC.placeMarket(
        signer,
        contractAddress,
        marketParams,
        {
            size,
            isBuy: true,
            fillOrKill: true
        }
    );
})();
```

### Place Limit Buy

To place a limit buy order:

```typescript
import { ethers } from "ethers";
import * as KuruSdk from "@kuru-labs/kuru-sdk";
import * as KuruConfig from "./config.json";

const { rpcUrl, contractAddress } = KuruConfig;
const privateKey = process.env.PRIVATE_KEY as string;
const args = process.argv.slice(2);
const price = parseFloat(args[0]);
const size = parseFloat(args[1]);

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, contractAddress);

    await KuruSdk.GTC.placeLimit(
        signer,
        contractAddress,
        marketParams,
        {
            price,
            size,
            isBuy: true,
            postOnly: true
        }
    );
})();
```

### Swap

To perform a token swap:

```typescript
import { ethers } from "ethers";
import * as KuruSdk from "@kuru-labs/kuru-sdk";
import * as KuruConfig from "./config.json";

const { rpcUrl, routerAddress, baseTokenAddress, quoteTokenAddress } = KuruConfig;
const privateKey = process.env.PRIVATE_KEY as string;
const size = parseFloat(process.argv[2]);

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    const routeOutput = await KuruSdk.PathFinder.findBestPath(
        provider,
        baseTokenAddress,
        quoteTokenAddress,
        size
    );

    await KuruSdk.TokenSwap.swap(
        signer,
        routerAddress,
        routeOutput,
        size,
        18,
        18,
        10
    );
})();
```
