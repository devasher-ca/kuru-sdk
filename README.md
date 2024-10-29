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
    "userAddress": "your-user-address",
    "vaultAddress": "your-vault-address"
}
```

Ensure you export your private key to use the examples
```bash
export PRIVATE_KEY=<0xpvt_key>
```

Ensure you export kuru api url
```bash
export KURU_API=<kuru_api_url>
```

## Example Usage

### Cancel Order

To cancel orders using the Kuru SDK:

```typescript
import { ethers, BigNumber } from "ethers";
import * as KuruSdk from "../../src";
import * as KuruConfig from "../config.json";

const {rpcUrl, contractAddress} = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

const args = process.argv.slice(2);

(async () => {
	const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    try {
        const txReceipt = await KuruSdk.OrderCanceler.cancelOrders(
            signer,
            contractAddress,
            args.map(arg => BigNumber.from(parseInt(arg)))
        );

        console.log("Transaction hash:", txReceipt.transactionHash);
    } catch (err: any) {
        console.error("Error:", err);
    }
})();
```

### Deposit

To deposit tokens into a margin account:

```typescript
import { ethers } from "ethers";

import * as KuruSdk from "../../src";
import * as KuruConfig from "../config.json";

const {userAddress, rpcUrl, marginAccountAddress, baseTokenAddress} = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
	
    try {
        const receipt = await KuruSdk.MarginDeposit.deposit(
            signer,
            marginAccountAddress,
            userAddress,
            baseTokenAddress,
            10000,
            18,
            true
        );
        console.log("Transaction hash:", receipt.transactionHash);
    } catch (error: any) {
        console.error("Error depositing:", error);
    }
})();
```

### Estimate Base for Sell

To estimate the required base for a sell operation:

```typescript
import { ethers } from "ethers";

import * as KuruSdk from "../../src";
import * as KuruConfig from "./../config.json";
import orderbookAbi from "../../abi/OrderBook.json";

const {rpcUrl, contractAddress, userAddress} = KuruConfig;

const args = process.argv.slice(2);
const amount = parseFloat(args[0]);

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, contractAddress);

    const orderbook = new ethers.Contract(contractAddress, orderbookAbi.abi, provider);
    const l2Book = await orderbook.getL2Book(userAddress);
    const vaultParams = await orderbook.getVaultParams();
    

	try {
		const estimate = await KuruSdk.CostEstimator.estimateRequiredBaseForSell(
			provider,
			contractAddress,
			marketParams,
			amount,
			l2Book,
			vaultParams
		);

		console.log(estimate);
	} catch (error) {
		console.error("Error estimating required base for sell:", error);
	}
})();
```

### Estimate Buy

To estimate the buy amount:

```typescript
import { ethers } from "ethers";

import * as KuruSdk from "../../src";
import * as KuruConfig from "./../config.json";

const {rpcUrl, contractAddress} = KuruConfig;

const args = process.argv.slice(2);
const amount = parseFloat(args[0]);

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, contractAddress);

	try {
		const estimate = await KuruSdk.CostEstimator.estimateMarketBuy(
			provider,
			contractAddress,
			marketParams,
			amount
		);

		console.log(estimate);
	} catch (error) {
		console.error("Error estimating market buy:", error);
	}
})();
```

### Find Best Path

To find the best path for a swap:

```typescript
import { ethers } from "ethers";

import * as KuruSdk from "../../src";
import * as KuruConfig from "./../config.json";

const { rpcUrl } = KuruConfig;

const args = process.argv.slice(2);
const amount = parseFloat(args[0]);

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    try {
        const bestPath = await KuruSdk.PathFinder.findBestPath(
            provider,
            <fromTokenAddress>,
            <toTokenAddress>,
            amount,
            "amountIn"
        );

        console.log(bestPath);
        console.log(bestPath.route.path);
        console.log(bestPath.output);
    } catch (error) {
        console.error("Error finding best path:", error);
    }
})();
```

### Market Buy

To perform a market buy:

```typescript
import { ethers } from "ethers";

import * as KuruSdk from "../../src";
import * as KuruConfig from "./../config.json";

const { rpcUrl, contractAddress } = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

const args = process.argv.slice(2);
const size = parseFloat(args[0]);
const minAmountOut = parseFloat(args[1]);

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    try {
        const marketParams = await KuruSdk.ParamFetcher.getMarketParams(
            provider,
            contractAddress
        );
        const receipt = await KuruSdk.IOC.placeMarket(signer, contractAddress, marketParams, {
            approveTokens: true,
            size,
            isBuy: true,
            minAmountOut,
            isMargin: false,
            fillOrKill: true,
        });
        console.log("Transaction hash:", receipt.transactionHash);
    } catch (error) {
        console.error("Error placing market buy order:", error);
    }
})();
```

### Place Limit Buy

To place a limit buy order:

```typescript
import { ethers } from "ethers";

import * as KuruSdk from "../../src";
import * as KuruConfig from "./../config.json";

const {rpcUrl, contractAddress} = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

const args = process.argv.slice(2);
const price = parseFloat(args[0]);
const size = parseFloat(args[1]);

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, contractAddress);

    try {
        const receipt = await KuruSdk.GTC.placeLimit(
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
        console.log("Transaction hash:", receipt.transactionHash);
    } catch (error) {
        console.error("Error placing limit buy order:", error);
    }
})();
```

### Swap

To perform a token swap:

```typescript
import { ethers } from "ethers";

import * as KuruSdk from "../../src";
import * as KuruConfig from "./../config.json";

const { rpcUrl, routerAddress, baseTokenAddress, quoteTokenAddress } =
  KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

const args = process.argv.slice(2);
const size = parseFloat(args[0]);

(async () => {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);

  try {
    const routeOutput = await KuruSdk.PathFinder.findBestPath(
      provider,
      baseTokenAddress,
      quoteTokenAddress,
      size
    );

    const receipt = await KuruSdk.TokenSwap.swap(
      signer,
      routerAddress,
      routeOutput,
      size,
      18, // In token decimals
      18, // Out token decimals
      10, // Slippage tolerance(%)
      true, // Boolean indicating whether to approve tokens
      (txHash: string | null) => {
        console.log(`Transaction hash: ${txHash}`);
      } // Callback function for what to do after approval
    );
    console.log("Transaction hash:", receipt.transactionHash);
  } catch (error) {
    console.error("Error performing swap:", error);
  }
})();
```
