import { ethers, ContractReceipt } from "ethers";
import { BatchLPDetails } from "./positionViewer";
import { TransactionOptions } from "../types";
import orderbookAbi from "../../abi/OrderBook.json";

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
        batchDetails: BatchLPDetails
    ): Promise<ContractReceipt> {
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
        const tx = await contract.batchProvisionLiquidity(
            prices,
            flipPrices,
            sizes,
            isBuy,
            false
        );

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
        txOptions?: TransactionOptions
    ): Promise<ethers.providers.TransactionRequest> {
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

        const orderbookInterface = new ethers.utils.Interface(orderbookAbi.abi);
        const data = orderbookInterface.encodeFunctionData("batchProvisionLiquidity", [
            prices,
            flipPrices,
            sizes,
            isBuy,
            false
        ]);

        const tx: ethers.providers.TransactionRequest = {
            to: contractAddress,
            from: address,
            data,
            ...(txOptions?.nonce !== undefined && { nonce: txOptions.nonce }),
            ...(txOptions?.gasLimit && { gasLimit: txOptions.gasLimit }),
            ...(txOptions?.gasPrice && { gasPrice: txOptions.gasPrice }),
            ...(txOptions?.maxFeePerGas && { maxFeePerGas: txOptions.maxFeePerGas }),
            ...(txOptions?.maxPriorityFeePerGas && { maxPriorityFeePerGas: txOptions.maxPriorityFeePerGas }),
        };

        const [gasLimit, baseGasPrice] = await Promise.all([
            !tx.gasLimit
                ? signer.estimateGas({
                      ...tx,
                      gasPrice: ethers.utils.parseUnits("1", "gwei"),
                  })
                : Promise.resolve(tx.gasLimit),
            !tx.gasPrice && !tx.maxFeePerGas
                ? signer.provider!.getGasPrice()
                : Promise.resolve(undefined),
        ]);

        if (!tx.gasLimit) {
            tx.gasLimit = gasLimit;
        }

        if (!tx.gasPrice && !tx.maxFeePerGas && baseGasPrice) {
            if (txOptions?.priorityFee) {
                const priorityFeeWei = ethers.utils.parseUnits(
                    txOptions.priorityFee.toString(),
                    "gwei"
                );
                tx.gasPrice = baseGasPrice.add(priorityFeeWei);
            } else {
                tx.gasPrice = baseGasPrice;
            }
        }

        return tx;
    }
}
