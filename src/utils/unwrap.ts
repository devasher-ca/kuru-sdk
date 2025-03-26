// ============ External Imports ============
import { ethers, BigNumber } from "ethers";

// ============ Internal Imports ============
import { extractErrorMessage } from "./errorExtractor";
import wmonAbi from "../../abi/WMon.json";
import { TransactionOptions } from "../types";

/**
 * @dev Wraps native tokens into wrapped tokens (e.g. ETH -> WETH)
 * @param wrapperContract - The wrapper token contract instance
 * @param amount - Amount of native tokens to wrap
 * @returns Transaction hash
 */
export async function constructWrapTransaction(
    signer: ethers.Signer,
    wrapperContractAddress: string,
    amount: BigNumber,
    txOptions?: TransactionOptions
): Promise<ethers.providers.TransactionRequest> {
    try {
        const address = await signer.getAddress();
        const wrapperContractInterface = new ethers.utils.Interface(wmonAbi);
        const data = wrapperContractInterface.encodeFunctionData("deposit");
        
        const tx: ethers.providers.TransactionRequest = {
            to: wrapperContractAddress,
            from: address,
            value: amount,
            data,
            ...(txOptions?.nonce !== undefined && { nonce: txOptions.nonce }),
            ...(txOptions?.gasLimit && { gasLimit: txOptions.gasLimit }),
            ...(txOptions?.gasPrice && { gasPrice: txOptions.gasPrice }),
            ...(txOptions?.maxFeePerGas && { maxFeePerGas: txOptions.maxFeePerGas }),
            ...(txOptions?.maxPriorityFeePerGas && { maxPriorityFeePerGas: txOptions.maxPriorityFeePerGas })
        };

        const [gasLimit, baseGasPrice] = await Promise.all([
            !tx.gasLimit ? signer.estimateGas({
                ...tx,
                gasPrice: ethers.utils.parseUnits('1', 'gwei')
            }) : Promise.resolve(tx.gasLimit),
            (!tx.gasPrice && !tx.maxFeePerGas) ? signer.provider!.getGasPrice() : Promise.resolve(undefined)
        ]);

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

        return tx;
    } catch (e: any) {
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e);
    }
}

/**
 * @dev Unwraps wrapped tokens back to native tokens (e.g. WETH -> ETH)
 * @param wrapperContract - The wrapper token contract instance
 * @param amount - Amount of wrapped tokens to unwrap
 * @returns Transaction hash
 */
export async function constructUnwrapTransaction(
    signer: ethers.Signer,
    wrapperContractAddress: string,
    amount: BigNumber,
    txOptions?: TransactionOptions
): Promise<ethers.providers.TransactionRequest> {
    try {
        const address = await signer.getAddress();
        const wrapperContractInterface = new ethers.utils.Interface(wmonAbi);
        const data = wrapperContractInterface.encodeFunctionData("withdraw", [
            amount,
        ]);
        
        const tx: ethers.providers.TransactionRequest = {
            to: wrapperContractAddress,
            from: address,
            data,
            ...(txOptions?.nonce !== undefined && { nonce: txOptions.nonce }),
            ...(txOptions?.gasLimit && { gasLimit: txOptions.gasLimit }),
            ...(txOptions?.gasPrice && { gasPrice: txOptions.gasPrice }),
            ...(txOptions?.maxFeePerGas && { maxFeePerGas: txOptions.maxFeePerGas }),
            ...(txOptions?.maxPriorityFeePerGas && { maxPriorityFeePerGas: txOptions.maxPriorityFeePerGas })
        };

        const [gasLimit, baseGasPrice] = await Promise.all([
            !tx.gasLimit ? signer.estimateGas({
                ...tx,
                gasPrice: ethers.utils.parseUnits('1', 'gwei')
            }) : Promise.resolve(tx.gasLimit),
            (!tx.gasPrice && !tx.maxFeePerGas) ? signer.provider!.getGasPrice() : Promise.resolve(undefined)
        ]);

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

        return tx;
    } catch (e: any) {
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e);
    }
}
