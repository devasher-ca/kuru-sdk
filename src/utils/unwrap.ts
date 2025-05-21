// ============ External Imports ============
import { ethers, BigNumber } from 'ethers';

// ============ Internal Imports ============
import { extractErrorMessage } from './errorExtractor';
import wmonAbi from '../../abi/WMon.json';
import { TransactionOptions } from '../types';
import buildTransactionRequest from './txConfig';

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
    txOptions?: TransactionOptions,
): Promise<ethers.providers.TransactionRequest> {
    try {
        const address = await signer.getAddress();
        const wrapperContractInterface = new ethers.utils.Interface(wmonAbi);
        const data = wrapperContractInterface.encodeFunctionData('deposit');

        return buildTransactionRequest({
            to: wrapperContractAddress,
            from: address,
            value: amount,
            data,
            txOptions,
            signer,
        });
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
    txOptions?: TransactionOptions,
): Promise<ethers.providers.TransactionRequest> {
    try {
        const address = await signer.getAddress();
        const wrapperContractInterface = new ethers.utils.Interface(wmonAbi);
        const data = wrapperContractInterface.encodeFunctionData('withdraw', [amount]);

        return buildTransactionRequest({
            to: wrapperContractAddress,
            from: address,
            data,
            txOptions,
            signer,
        });
    } catch (e: any) {
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e);
    }
}
