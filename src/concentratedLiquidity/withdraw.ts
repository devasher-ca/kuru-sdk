import { ethers, ContractReceipt } from "ethers";
import { TransactionOptions } from "../types";
import orderbookAbi from "../../abi/OrderBook.json";
import buildTransactionRequest from "../utils/txConfig";

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
        const contract = new ethers.Contract(
            contractAddress,
            orderbookAbi.abi,
            signer
        );

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
        const data = orderbookInterface.encodeFunctionData(
            "batchCancelFlipOrders",
            [orderIds]
        );

        return buildTransactionRequest({
            from: address,
            to: contractAddress,
            signer,
            data,
            txOptions,
        });
    }
}
