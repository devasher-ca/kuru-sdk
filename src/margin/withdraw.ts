// ============ External Imports ============
import { TransactionReceipt, ethers, parseUnits } from 'ethers';

// ============ Internal Imports ============
import { extractErrorMessage } from '../utils';

// ============ Config Imports ============
import marginAccountAbi from '../../abi/MarginAccount.json';
import { TransactionOptions } from 'src/types';
import buildTransactionRequest from '../utils/txConfig';

export abstract class MarginWithdraw {
    static async withdraw(
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
        marginAccountAddress: string,
        tokenAddress: string,
        amount: number,
        decimals: number,
        txOptions?: TransactionOptions,
    ): Promise<TransactionReceipt> {
        try {
            let signer;
            try {
                signer = (await (providerOrSigner as any).getAddress())
                    ? providerOrSigner
                    : await (providerOrSigner as any).getSigner();
            } catch {
                signer = await (providerOrSigner as any).getSigner();
            }

            const formattedAmount = parseUnits(amount.toString(), decimals);

            const tx = await MarginWithdraw.constructWithdrawTransaction(
                signer,
                marginAccountAddress,
                tokenAddress,
                formattedAmount.toString(),
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

    static async constructWithdrawTransaction(
        signer: ethers.AbstractSigner,
        marginAccountAddress: string,
        tokenAddress: string,
        amount: string,
        txOptions?: TransactionOptions,
    ): Promise<ethers.TransactionRequest> {
        const address = await signer.getAddress();
        const marginAccountInterface = new ethers.Interface(marginAccountAbi.abi);

        const data = marginAccountInterface.encodeFunctionData('withdraw', [amount, tokenAddress]);

        return buildTransactionRequest({
            to: marginAccountAddress,
            from: address,
            data,
            txOptions,
            signer,
        });
    }

    static async batchClaimMaxTokens(
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
        marginAccountAddress: string,
        tokens: string[],
        txOptions?: TransactionOptions,
    ): Promise<TransactionReceipt> {
        let signer;
        try {
            signer = (await (providerOrSigner as any).getAddress())
                ? providerOrSigner
                : await (providerOrSigner as any).getSigner();
        } catch {
            signer = await (providerOrSigner as any).getSigner();
        }

        const tx = await MarginWithdraw.constructBatchClaimMaxTokensTransaction(
            signer,
            marginAccountAddress,
            tokens,
            txOptions,
        );

        const transaction = await signer.sendTransaction(tx);
        const receipt = await transaction.wait();
        if (!receipt) {
            throw new Error('Transaction failed');
        }
        return receipt;
    }

    static async constructBatchClaimMaxTokensTransaction(
        signer: ethers.AbstractSigner,
        marginAccountAddress: string,
        tokens: string[],
        txOptions?: TransactionOptions,
    ): Promise<ethers.TransactionRequest> {
        const address = await signer.getAddress();
        const marginAccountInterface = new ethers.Interface(marginAccountAbi.abi);

        const data = marginAccountInterface.encodeFunctionData('batchClaimMaxTokens', [tokens]);

        return buildTransactionRequest({
            to: marginAccountAddress,
            from: address,
            data,
            txOptions,
            signer,
        });
    }
}
