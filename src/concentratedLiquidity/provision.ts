import { ethers, ContractTransactionResponse } from 'ethers';
import { BatchLPDetails } from './positionViewer';
import { TransactionOptions } from '../types';
import orderbookAbi from '../../abi/OrderBook.json';
import buildTransactionRequest from '../utils/txConfig';

export abstract class PositionProvider {
    /**
     * @dev Submits a batch of liquidity positions to the contract
     * @param signer - The signer object
     * @param contractAddress - The contract address
     * @param batchDetails - The batch liquidity position details
     * @returns A promise that resolves to the transaction
     */
    static async provisionLiquidity(
        signer: ethers.Signer,
        contractAddress: string,
        batchDetails: BatchLPDetails,
    ): Promise<ContractTransactionResponse> {
        // Create contract instance
        const contract = new ethers.Contract(contractAddress, orderbookAbi.abi, signer);

        const prices: bigint[] = [];
        const flipPrices: bigint[] = [];
        const sizes: bigint[] = [];
        const isBuy: boolean[] = [];

        // Add bids
        for (const bid of batchDetails.bids) {
            prices.push(bid.price);
            flipPrices.push(bid.flipPrice);
            sizes.push(bid.liquidity);
            isBuy.push(true);
        }

        // Add asks
        for (const ask of batchDetails.asks) {
            prices.push(ask.price);
            flipPrices.push(ask.flipPrice);
            sizes.push(ask.liquidity);
            isBuy.push(false);
        }

        // Call the contract with provisionOrRevert = false
        const tx = await contract.batchProvisionLiquidity(prices, flipPrices, sizes, isBuy, false);

        const receipt = await tx.wait();

        return receipt;
    }

    /**
     * @dev Constructs a transaction for batch liquidity provision
     * @param signer - The signer instance
     * @param contractAddress - The contract address
     * @param batchDetails - The batch liquidity position details
     * @param txOptions - Transaction options
     * @returns A promise that resolves to the transaction request object
     */
    static async constructBatchProvisionTransaction(
        signer: ethers.Signer,
        contractAddress: string,
        batchDetails: BatchLPDetails,
        txOptions?: TransactionOptions,
    ): Promise<ethers.TransactionRequest> {
        const address = await signer.getAddress();

        const prices: bigint[] = [];
        const flipPrices: bigint[] = [];
        const sizes: bigint[] = [];
        const isBuy: boolean[] = [];

        // Add bids
        for (const bid of batchDetails.bids) {
            prices.push(bid.price);
            flipPrices.push(bid.flipPrice);
            sizes.push(bid.liquidity);
            isBuy.push(true);
        }

        // Add asks
        for (const ask of batchDetails.asks) {
            prices.push(ask.price);
            flipPrices.push(ask.flipPrice);
            sizes.push(ask.liquidity);
            isBuy.push(false);
        }

        const orderbookInterface = new ethers.Interface(orderbookAbi.abi);
        const data = orderbookInterface.encodeFunctionData('batchProvisionLiquidity', [
            prices,
            flipPrices,
            sizes,
            isBuy,
            false,
        ]);

        return buildTransactionRequest({
            from: address,
            to: contractAddress,
            signer,
            data,
            txOptions,
        });
    }
}
