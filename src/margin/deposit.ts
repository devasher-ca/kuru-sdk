// ============ External Imports ============
import { TransactionReceipt, ethers, ZeroAddress, parseUnits } from 'ethers';

// ============ Internal Imports ============
import { extractErrorMessage, approveToken, estimateApproveGas } from '../utils';
import { TransactionOptions } from 'src/types';

// ============ Config Imports ============
import erc20Abi from '../../abi/IERC20.json';
import marginAccountAbi from '../../abi/MarginAccount.json';
import buildTransactionRequest from '../utils/txConfig';

export abstract class MarginDeposit {
    static async deposit(
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
        marginAccountAddress: string,
        userAddress: string,
        tokenAddress: string,
        amount: string,
        decimals: number,
        approveTokens: boolean,
        txOptions?: TransactionOptions,
    ): Promise<TransactionReceipt> {
        console.log('typeof providerOrSigner', typeof providerOrSigner);
        console.log('providerOrSigner', providerOrSigner instanceof ethers.AbstractSigner);
        try {
            const tokenContract = new ethers.Contract(tokenAddress, erc20Abi.abi, providerOrSigner);

            if (approveTokens && tokenAddress !== ZeroAddress) {
                await approveToken(tokenContract, marginAccountAddress, parseUnits(amount, decimals), providerOrSigner);
            }
            const formattedAmount = parseUnits(amount, decimals);

            let signer;
            try {
                signer = (await (providerOrSigner as any).getAddress())
                    ? providerOrSigner
                    : await (providerOrSigner as any).getSigner();
            } catch {
                signer = await (providerOrSigner as any).getSigner();
            }

            const tx = await MarginDeposit.constructDepositTransaction(
                signer,
                marginAccountAddress,
                userAddress,
                tokenAddress,
                formattedAmount,
                txOptions,
            );

            const transaction = await signer.sendTransaction(tx);
            const receipt = await transaction.wait();
            if (!receipt) {
                throw new Error('Transaction failed');
            }
            return receipt;
        } catch (e: any) {
            if (!e.error) {
                throw e;
            }
            throw extractErrorMessage(e);
        }
    }

    static async constructDepositTransaction(
        signer: ethers.AbstractSigner,
        marginAccountAddress: string,
        userAddress: string,
        tokenAddress: string,
        amount: bigint,
        txOptions?: TransactionOptions,
    ): Promise<ethers.TransactionRequest> {
        const address = await signer.getAddress();
        const marginAccountInterface = new ethers.Interface(marginAccountAbi.abi);

        const data = marginAccountInterface.encodeFunctionData('deposit', [userAddress, tokenAddress, amount]);

        const value = tokenAddress === ZeroAddress ? amount : BigInt(0);

        return buildTransactionRequest({
            to: marginAccountAddress,
            from: address,
            data,
            value,
            txOptions,
            signer,
        });
    }

    static async estimateGas(
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
        marginAccountAddress: string,
        userAddress: string,
        tokenAddress: string,
        amount: string,
        decimals: number,
        approveTokens: boolean,
    ): Promise<bigint> {
        try {
            const tokenContract = new ethers.Contract(tokenAddress, erc20Abi.abi, providerOrSigner);
            const marginAccount = new ethers.Contract(marginAccountAddress, marginAccountAbi.abi, providerOrSigner);

            const formattedAmount = parseUnits(amount, decimals);

            let gasEstimate: bigint;
            if (tokenAddress === ZeroAddress) {
                gasEstimate = await marginAccount.deposit.estimateGas(userAddress, tokenAddress, formattedAmount, {
                    value: formattedAmount,
                });
            } else {
                if (approveTokens) {
                    gasEstimate = await estimateApproveGas(
                        tokenContract,
                        marginAccountAddress,
                        parseUnits(amount, decimals),
                    );
                } else {
                    gasEstimate = await marginAccount.deposit.estimateGas(userAddress, tokenAddress, formattedAmount);
                }
            }

            return gasEstimate;
        } catch (e: any) {
            if (!e.error) {
                throw e;
            }
            throw extractErrorMessage(e);
        }
    }
}
