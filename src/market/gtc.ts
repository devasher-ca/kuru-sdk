// ============ External Imports ============
import { ethers, BigNumber, ContractReceipt } from "ethers";

// ============ Internal Imports ============
import { extractErrorMessage, log10BigNumber } from "../utils";
import { MarketParams, LIMIT, TransactionOptions } from "../types";

// ============ Config Imports ============
import orderbookAbi from "../../abi/OrderBook.json";

export abstract class GTC {
    /**
     * @dev Places a limit order (buy or sell) on the order book.
     * @param providerOrSigner - The ethers.js provider or signer to interact with the blockchain.
     * @param orderbookAddress - The address of the order book contract.
     * @param marketParams - The market parameters including price and size precision.
     * @param order - The limit order object containing price, size, isBuy, and postOnly properties.
     * @param txOptions - The transaction options for the order.
     * @returns A promise that resolves to a boolean indicating success or failure.
     */
    static async placeLimit(
        providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
        orderbookAddress: string,
        marketParams: MarketParams,
        order: LIMIT,
        txOptions?: TransactionOptions
    ): Promise<ContractReceipt> {
        const orderbook = new ethers.Contract(
            orderbookAddress,
            orderbookAbi.abi,
            providerOrSigner
        );

        const clippedPrice = order.price.toFixed(
            log10BigNumber(marketParams.pricePrecision)
        );
        const clippedSize = order.size.toFixed(
            log10BigNumber(marketParams.sizePrecision)
        );

        const priceBn: BigNumber = ethers.utils.parseUnits(
            clippedPrice.toString(),
            log10BigNumber(marketParams.pricePrecision)
        );
        const sizeBn: BigNumber = ethers.utils.parseUnits(
            clippedSize.toString(),
            log10BigNumber(marketParams.sizePrecision)
        );

        return order.isBuy
            ? addBuyOrder(orderbook, priceBn, sizeBn, order.postOnly, txOptions)
            : addSellOrder(orderbook, priceBn, sizeBn, order.postOnly, txOptions);
    }

    static async estimateGas(
        providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
        orderbookAddress: string,
        marketParams: MarketParams,
        order: LIMIT
    ): Promise<BigNumber> {
        const orderbook = new ethers.Contract(
            orderbookAddress,
            orderbookAbi.abi,
            providerOrSigner
        );

        const clippedPrice = order.price.toFixed(
            log10BigNumber(marketParams.pricePrecision)
        );
        const clippedSize = order.size.toFixed(
            log10BigNumber(marketParams.sizePrecision)
        );

        const priceBn: BigNumber = ethers.utils.parseUnits(
            clippedPrice.toString(),
            log10BigNumber(marketParams.pricePrecision)
        );
        const sizeBn: BigNumber = ethers.utils.parseUnits(
            clippedSize.toString(),
            log10BigNumber(marketParams.sizePrecision)
        );

        return order.isBuy
            ? estimateGasBuy(orderbook, priceBn, sizeBn, order.postOnly)
            : estimateGasSell(orderbook, priceBn, sizeBn, order.postOnly);
    }
}

// ======================== INTERNAL HELPER FUNCTIONS ========================

/**
 * @dev Adds a buy limit order to the order book.
 * @param orderbook - The order book contract instance.
 * @param price - The price of the order.
 * @param size - The size of the order.
 * @param postOnly - A boolean indicating whether the order should be post-only.
 * @param txOptions - The transaction options for the order.
 * @returns A promise that resolves to a boolean indicating success or failure.
 */
async function addBuyOrder(
    orderbook: ethers.Contract,
    price: BigNumber,
    size: BigNumber,
    postOnly: boolean,
    txOptions?: TransactionOptions
): Promise<ContractReceipt> {
    console.time('Total Limit Buy Time');
    try {
        console.time('Get Signer Time');
        const signer = orderbook.signer;
        const address = await signer.getAddress();
        console.timeEnd('Get Signer Time');

        const data = orderbook.interface.encodeFunctionData("addBuyOrder", [
            price,
            size,
            postOnly
        ]);

        const tx: ethers.providers.TransactionRequest = {
            to: orderbook.address,
            from: address,
            data,
            ...(txOptions?.nonce !== undefined && { nonce: txOptions.nonce }),
            ...(txOptions?.gasLimit && { gasLimit: txOptions.gasLimit }),
            ...(txOptions?.gasPrice && { gasPrice: txOptions.gasPrice }),
            ...(txOptions?.maxFeePerGas && { maxFeePerGas: txOptions.maxFeePerGas }),
            ...(txOptions?.maxPriorityFeePerGas && { maxPriorityFeePerGas: txOptions.maxPriorityFeePerGas })
        };

        console.time('RPC Calls Time');
        const [gasLimit, baseGasPrice] = await Promise.all([
            !tx.gasLimit ? signer.estimateGas({
                ...tx,
                gasPrice: ethers.utils.parseUnits('1', 'gwei'),
            }) : Promise.resolve(tx.gasLimit),
            (!tx.gasPrice && !tx.maxFeePerGas) ? signer.provider!.getGasPrice() : Promise.resolve(undefined)
        ]);
        console.timeEnd('RPC Calls Time');

        if (!tx.gasLimit) {
            tx.gasLimit = gasLimit;
        }

        if (!tx.gasPrice && !tx.maxFeePerGas && baseGasPrice) {
            if (txOptions?.priorityFee) {
                const priorityFeeWei = ethers.utils.parseUnits(
                    txOptions.priorityFee.toString(),
                    'gwei'
                );
                tx.gasPrice = baseGasPrice.add(priorityFeeWei);
            } else {
                tx.gasPrice = baseGasPrice;
            }
        }

        console.time('Transaction Send Time');
        const transaction = await signer.sendTransaction(tx);
        console.timeEnd('Transaction Send Time');

        console.time('Transaction Wait Time');
        const receipt = await transaction.wait(1);
        console.timeEnd('Transaction Wait Time');

        console.timeEnd('Total Limit Buy Time');
        return receipt;
    } catch (e: any) {
        console.timeEnd('Total Limit Buy Time');
        console.log({ e });
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e);
    }
}

async function estimateGasBuy(
    orderbook: ethers.Contract,
    price: BigNumber,
    size: BigNumber,
    postOnly: boolean
): Promise<BigNumber> {
    try {
        const gasEstimate = await orderbook.estimateGas.addBuyOrder(
            price,
            size,
            postOnly
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
 * @dev Adds a sell limit order to the order book.
 * @param orderbook - The order book contract instance.
 * @param price - The price of the order.
 * @param size - The size of the order.
 * @param postOnly - A boolean indicating whether the order should be post-only.
 * @param txOptions - The transaction options for the order.
 * @returns A promise that resolves to a boolean indicating success or failure.
 */
async function addSellOrder(
    orderbook: ethers.Contract,
    price: BigNumber,
    size: BigNumber,
    postOnly: boolean,
    txOptions?: TransactionOptions
): Promise<ContractReceipt> {
    console.time('Total Limit Sell Time');
    try {
        console.time('Get Signer Time');
        const signer = orderbook.signer;
        const address = await signer.getAddress();
        console.timeEnd('Get Signer Time');

        const data = orderbook.interface.encodeFunctionData("addSellOrder", [
            price,
            size,
            postOnly
        ]);

        const tx: ethers.providers.TransactionRequest = {
            to: orderbook.address,
            from: address,
            data,
            ...(txOptions?.nonce !== undefined && { nonce: txOptions.nonce }),
            ...(txOptions?.gasLimit && { gasLimit: txOptions.gasLimit }),
            ...(txOptions?.gasPrice && { gasPrice: txOptions.gasPrice }),
            ...(txOptions?.maxFeePerGas && { maxFeePerGas: txOptions.maxFeePerGas }),
            ...(txOptions?.maxPriorityFeePerGas && { maxPriorityFeePerGas: txOptions.maxPriorityFeePerGas })
        };

        console.time('RPC Calls Time');
        const [gasLimit, baseGasPrice] = await Promise.all([
            !tx.gasLimit ? signer.estimateGas({
                ...tx,
                gasPrice: ethers.utils.parseUnits('1', 'gwei'),
            }) : Promise.resolve(tx.gasLimit),
            (!tx.gasPrice && !tx.maxFeePerGas) ? signer.provider!.getGasPrice() : Promise.resolve(undefined)
        ]);
        console.timeEnd('RPC Calls Time');

        if (!tx.gasLimit) {
            tx.gasLimit = gasLimit;
        }

        if (!tx.gasPrice && !tx.maxFeePerGas && baseGasPrice) {
            if (txOptions?.priorityFee) {
                const priorityFeeWei = ethers.utils.parseUnits(
                    txOptions.priorityFee.toString(),
                    'gwei'
                );
                tx.gasPrice = baseGasPrice.add(priorityFeeWei);
            } else {
                tx.gasPrice = baseGasPrice;
            }
        }

        console.time('Transaction Send Time');
        const transaction = await signer.sendTransaction(tx);
        console.timeEnd('Transaction Send Time');

        console.time('Transaction Wait Time');
        const receipt = await transaction.wait(1);
        console.timeEnd('Transaction Wait Time');

        console.timeEnd('Total Limit Sell Time');
        return receipt;
    } catch (e: any) {
        console.timeEnd('Total Limit Sell Time');
        console.log({ e });
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e);
    }
}

async function estimateGasSell(
    orderbook: ethers.Contract,
    price: BigNumber,
    size: BigNumber,
    postOnly: boolean
): Promise<BigNumber> {
    try {
        const gasEstimate = await orderbook.estimateGas.addSellOrder(
            price,
            size,
            postOnly
        );
        return gasEstimate;
    } catch (e: any) {
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e);
    }
}
