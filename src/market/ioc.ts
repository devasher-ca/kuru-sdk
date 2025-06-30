// ============ External Imports ============
import { ethers, parseUnits, ZeroAddress } from 'ethers';

// ============ Internal Imports ============
import { extractErrorMessage, log10BigNumber, approveToken, estimateApproveGas } from '../utils';
import { MarketParams, MARKET, TransactionOptions } from '../types';

// ============ Config Imports ============
import orderbookAbi from '../../abi/OrderBook.json';
import erc20Abi from '../../abi/IERC20.json';
import buildTransactionRequest from '../utils/txConfig';

export abstract class IOC {
    /**
     * @dev Places a market order (buy or sell) on the order book.
     * @param providerOrSigner - The ethers.js provider or signer to interact with the blockchain.
     * @param orderbookAddress - The address of the order book contract.
     * @param marketParams - The market parameters including price and size precision.
     * @param order - The market order object containing isBuy, size, and fillOrKill properties.
     * @returns A promise that resolves to the credited size.
     */
    static async placeMarket(
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
        orderbookAddress: string,
        marketParams: MarketParams,
        order: MARKET,
    ): Promise<ethers.TransactionReceipt> {
        const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, providerOrSigner);

        return order.isBuy
            ? placeAndExecuteMarketBuy(
                  providerOrSigner,
                  orderbook,
                  orderbookAddress,
                  marketParams,
                  order.approveTokens,
                  order.size,
                  order.minAmountOut,
                  order.isMargin ?? false,
                  order.fillOrKill,
                  order.txOptions,
              )
            : placeAndExecuteMarketSell(
                  providerOrSigner,
                  orderbook,
                  orderbookAddress,
                  marketParams,
                  order.approveTokens,
                  order.size,
                  order.minAmountOut,
                  order.isMargin ?? false,
                  order.fillOrKill,
                  order.txOptions,
              );
    }

    static async estimateGas(
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
        orderbookAddress: string,
        marketParams: MarketParams,
        order: MARKET,
        slippageTolerance: number,
    ): Promise<bigint> {
        const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi.abi, providerOrSigner);

        const size = (Number(order.size) * (100 - slippageTolerance)) / 100;

        if (order.approveTokens) {
            return estimateApproveGas(
                new ethers.Contract(marketParams.quoteAssetAddress, erc20Abi.abi, providerOrSigner),
                orderbookAddress,
                parseUnits(size.toString(), marketParams.quoteAssetDecimals),
            );
        }

        return order.isBuy
            ? estimateGasBuy(
                  orderbook,
                  marketParams,
                  size.toString(),
                  order.minAmountOut,
                  order.isMargin ?? false,
                  order.fillOrKill,
              )
            : estimateGasSell(
                  orderbook,
                  marketParams,
                  size.toString(),
                  order.minAmountOut,
                  order.isMargin ?? false,
                  order.fillOrKill,
              );
    }

    /**
     * @dev Constructs a market buy transaction.
     * @param signer - The signer instance.
     * @param orderbookAddress - The address of the order book contract.
     * @param marketParams - The market parameters including price and size precision.
     * @param quoteSize - The size of the quote asset to spend.
     * @param minAmountOut - The minimum amount of base asset to receive.
     * @param isMargin - Whether this is a margin trade.
     * @param isFillOrKill - Whether the order should be fill-or-kill.
     * @param txOptions - Optional transaction parameters like gas price and nonce.
     */
    static async constructMarketBuyTransaction(
        signer: ethers.AbstractSigner,
        orderbookAddress: string,
        marketParams: MarketParams,
        quoteSize: string,
        minAmountOut: string,
        isMargin: boolean,
        isFillOrKill: boolean,
        txOptions?: TransactionOptions,
    ): Promise<ethers.TransactionRequest> {
        const address = await signer.getAddress();
        const orderbookInterface = new ethers.Interface(orderbookAbi.abi);

        const data = orderbookInterface.encodeFunctionData('placeAndExecuteMarketBuy', [
            parseUnits(quoteSize, log10BigNumber(marketParams.pricePrecision)),
            minAmountOut,
            isMargin,
            isFillOrKill,
        ]);

        const parsedQuoteSize = parseUnits(quoteSize, marketParams.quoteAssetDecimals);

        const value = !isMargin && marketParams.quoteAssetAddress === ZeroAddress ? parsedQuoteSize : BigInt(0);

        return buildTransactionRequest({
            to: orderbookAddress,
            from: address,
            data,
            value,
            txOptions,
            signer,
        });
    }

    /* @dev Constructs a market sell transaction.
     * @param signer - The signer instance.
     * @param orderbookAddress - The address of the order book contract.
     * @param marketParams - The market parameters including price and size precision.
     * @param size - The size of the base asset to sell.
     * @param minAmountOut - The minimum amount of quote asset to receive.
     */
    static async constructMarketSellTransaction(
        signer: ethers.AbstractSigner,
        orderbookAddress: string,
        marketParams: MarketParams,
        size: string,
        minAmountOut: string,
        isMargin: boolean,
        isFillOrKill: boolean,
        txOptions?: TransactionOptions,
    ): Promise<ethers.TransactionRequest> {
        const address = await signer.getAddress();
        const orderbookInterface = new ethers.Interface(orderbookAbi.abi);

        const data = orderbookInterface.encodeFunctionData('placeAndExecuteMarketSell', [
            parseUnits(size, log10BigNumber(marketParams.sizePrecision)),
            minAmountOut,
            isMargin,
            isFillOrKill,
        ]);

        const parsedSize = parseUnits(size, marketParams.baseAssetDecimals);

        const value = !isMargin && marketParams.baseAssetAddress === ZeroAddress ? parsedSize : BigInt(0);

        return buildTransactionRequest({
            to: orderbookAddress,
            from: address,
            data,
            value,
            txOptions,
            signer,
        });
    }
}

// ======================== INTERNAL HELPER FUNCTIONS ========================

/**
 * @dev Places and executes a market buy order.
 * @param providerOrSigner - The ethers.js provider or signer to interact with the blockchain.
 * @param orderbook - The order book contract instance.
 * @param marketAddress - The address of the market contract.
 * @param marketParams - The market parameters including price and size precision.
 * @param approveTokens - Whether to approve token spending before placing the order.
 * @param quoteSize - The size of the quote asset to spend.
 * @param minAmountOut - The minimum amount of base asset to receive.
 * @param isMargin - Whether this is a margin trade.
 * @param isFillOrKill - Whether the order should be fill-or-kill.
 * @param txOptions - Optional transaction parameters like gas price and nonce.
 * @returns A promise that resolves to the transaction receipt.
 */
async function placeAndExecuteMarketBuy(
    providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
    orderbook: ethers.Contract,
    marketAddress: string,
    marketParams: MarketParams,
    approveTokens: boolean,
    quoteSize: string,
    minAmountOut: string,
    isMargin: boolean,
    isFillOrKill: boolean,
    txOptions?: TransactionOptions,
): Promise<ethers.TransactionReceipt> {
    const parsedQuoteSize = parseUnits(quoteSize, marketParams.quoteAssetDecimals);

    const parsedMinAmountOut = parseUnits(minAmountOut, marketParams.baseAssetDecimals);

    if (approveTokens && marketParams.quoteAssetAddress !== ZeroAddress && !isMargin) {
        const tokenContract = new ethers.Contract(marketParams.quoteAssetAddress, erc20Abi.abi, providerOrSigner);
        await approveToken(tokenContract, marketAddress, parsedQuoteSize, providerOrSigner);
    }

    try {
        // Extract signer from contract or use provider/signer directly
        let signer: ethers.AbstractSigner;
        if ('getAddress' in providerOrSigner) {
            signer = providerOrSigner as ethers.AbstractSigner;
        } else {
            throw new Error('Provider must have a signer for transaction execution');
        }

        const tx = await IOC.constructMarketBuyTransaction(
            signer,
            await orderbook.getAddress(),
            marketParams,
            quoteSize,
            parsedMinAmountOut.toString(),
            isMargin,
            isFillOrKill,
            txOptions,
        );
        const transaction = await signer.sendTransaction(tx);
        const receipt = await transaction.wait(1);

        if (!receipt) {
            throw new Error('Transaction receipt is null');
        }

        return receipt;
    } catch (e: any) {
        console.log({ e });
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e);
    }
}

async function estimateGasBuy(
    orderbook: ethers.Contract,
    marketParams: MarketParams,
    quoteSize: string,
    minAmountOut: string,
    isMargin: boolean,
    isFillOrKill: boolean,
): Promise<bigint> {
    try {
        const gasEstimate = await orderbook.placeAndExecuteMarketBuy.estimateGas(
            parseUnits(quoteSize, log10BigNumber(marketParams.pricePrecision)),
            minAmountOut,
            isMargin,
            isFillOrKill,
        );
        return gasEstimate;
    } catch (e: any) {
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e);
    }
}

/**
 * @dev Places and executes a market sell order.
 * @param providerOrSigner - The ethers.js provider or signer to interact with the blockchain.
 * @param orderbook - The order book contract instance.
 * @param marketAddress - The address of the market contract.
 * @param marketParams - The market parameters including price and size precision.
 * @param approveTokens - Whether to approve token spending before placing the order.
 * @param size - The size of the base asset to sell.
 * @param minAmountOut - The minimum amount of quote asset to receive.
 * @param isMargin - Whether this is a margin trade.
 * @param isFillOrKill - Whether the order should be fill-or-kill.
 * @param txOptions - Optional transaction parameters like gas price and nonce.
 * @returns A promise that resolves to the transaction receipt.
 */
async function placeAndExecuteMarketSell(
    providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
    orderbook: ethers.Contract,
    marketAddress: string,
    marketParams: MarketParams,
    approveTokens: boolean,
    size: string,
    minAmountOut: string,
    isMargin: boolean,
    isFillOrKill: boolean,
    txOptions?: TransactionOptions,
): Promise<ethers.TransactionReceipt> {
    const parsedSize = parseUnits(size, marketParams.baseAssetDecimals);

    const parsedMinAmountOut = parseUnits(minAmountOut, marketParams.quoteAssetDecimals);

    if (approveTokens && marketParams.baseAssetAddress !== ZeroAddress && !isMargin) {
        const tokenContract = new ethers.Contract(marketParams.baseAssetAddress, erc20Abi.abi, providerOrSigner);
        await approveToken(tokenContract, marketAddress, parsedSize, providerOrSigner);
    }

    try {
        // Extract signer from contract or use provider/signer directly
        let signer: ethers.AbstractSigner;
        if ('getAddress' in providerOrSigner) {
            signer = providerOrSigner as ethers.AbstractSigner;
        } else {
            throw new Error('Provider must have a signer for transaction execution');
        }

        const tx = await IOC.constructMarketSellTransaction(
            signer,
            await orderbook.getAddress(),
            marketParams,
            size,
            parsedMinAmountOut.toString(),
            isMargin,
            isFillOrKill,
            txOptions,
        );

        const transaction = await signer.sendTransaction(tx);
        const receipt = await transaction.wait();

        if (!receipt) {
            throw new Error('Transaction receipt is null');
        }

        return receipt;
    } catch (e: any) {
        console.log({ e });
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e);
    }
}

async function estimateGasSell(
    orderbook: ethers.Contract,
    marketParams: MarketParams,
    size: string,
    minAmountOut: string,
    isMargin: boolean,
    isFillOrKill: boolean,
): Promise<bigint> {
    try {
        const gasEstimate = await orderbook.placeAndExecuteMarketSell.estimateGas(
            parseUnits(size, log10BigNumber(marketParams.sizePrecision)),
            minAmountOut,
            isMargin,
            isFillOrKill,
        );

        return gasEstimate;
    } catch (e: any) {
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e);
    }
}
