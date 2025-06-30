import { ethers, parseUnits } from 'ethers';
import { TransactionOptions } from 'src/types';

export default async function buildTransactionRequest({
    from,
    to,
    signer,
    data,
    value,
    txOptions,
}: {
    from: string;
    to: string;
    signer: ethers.AbstractSigner;
    data: string;
    value?: ethers.BigNumberish;
    txOptions?: TransactionOptions;
}) {
    const tx: ethers.TransactionRequest = {
        to,
        from,
        data,
        value,
        ...(txOptions?.nonce !== undefined && { nonce: txOptions.nonce }),
        ...(txOptions?.gasLimit && { gasLimit: txOptions.gasLimit }),
        ...(txOptions?.gasPrice && { gasPrice: txOptions.gasPrice }),
        ...(txOptions?.maxFeePerGas && {
            maxFeePerGas: txOptions.maxFeePerGas,
        }),
        ...(txOptions?.maxPriorityFeePerGas && {
            maxPriorityFeePerGas: txOptions.maxPriorityFeePerGas,
        }),
    };

    console.log('estimateGas', tx.gasLimit);
    console.log('gasPrice', tx.gasPrice);

    const [gasLimit, baseGasPrice] = await Promise.all([
        !tx.gasLimit
            ? signer.estimateGas({
                  ...tx,
                  gasPrice: parseUnits('1', 'gwei'),
              })
            : Promise.resolve(tx.gasLimit),
        !tx.gasPrice && !tx.maxFeePerGas && signer.provider
            ? (signer.provider as ethers.JsonRpcProvider).getFeeData().then((fee) => fee.gasPrice)
            : Promise.resolve(undefined),
    ]);

    if (!tx.gasLimit) {
        tx.gasLimit = gasLimit;
    }

    if (!tx.gasPrice && !tx.maxFeePerGas && baseGasPrice) {
        if (txOptions?.priorityFee) {
            const priorityFeeWei = parseUnits(txOptions.priorityFee.toString(), 'gwei');
            tx.gasPrice = baseGasPrice + priorityFeeWei;
        } else {
            tx.gasPrice = baseGasPrice;
        }
    }

    return tx;
}
