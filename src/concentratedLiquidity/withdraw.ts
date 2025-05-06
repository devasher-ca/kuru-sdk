import { ethers, ContractReceipt } from "ethers";
import { TransactionOptions } from "../types";
import orderbookAbi from "../../abi/OrderBook.json";

export abstract class PositionWithdrawer {
    /**
     * @dev Cancels a batch of liquidity positions from the contract
     * @param signer - The signer object
     * @param contractAddress - The contract address
     * @param orderIds - Array of order IDs to cancel
     * @returns A promise that resolves to the transaction receipt
     */
    static async withdrawLiquidity(
        signer: ethers.Signer,
        contractAddress: string,
        orderIds: number[]
    ): Promise<ContractReceipt> {
        // Create contract instance
        const contract = new ethers.Contract(contractAddress, orderbookAbi.abi, signer);

        // Call the contract to cancel orders
        const tx = await contract.batchCancelFlipOrders(orderIds);
        const receipt = await tx.wait();

        return receipt;
    }

    /**
     * @dev Constructs a transaction for batch liquidity withdrawal
     * @param signer - The signer instance
     * @param contractAddress - The contract address
     * @param orderIds - Array of order IDs to cancel
     * @param txOptions - Transaction options
     * @returns A promise that resolves to the transaction request object
     */
    static async constructBatchWithdrawTransaction(
        signer: ethers.Signer,
        contractAddress: string,
        orderIds: number[],
        txOptions?: TransactionOptions
    ): Promise<ethers.providers.TransactionRequest> {
        const address = await signer.getAddress();

        const orderbookInterface = new ethers.utils.Interface(orderbookAbi.abi);
        const data = orderbookInterface.encodeFunctionData("batchCancelFlipOrders", [orderIds]);

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
