// ============ External Imports ============
import { ethers } from 'ethers';

// ============ Internal Imports ============
import { TransactionOptions } from 'src/types';
import { extractErrorMessage } from '../utils';

// ============ Config Imports ============
import monadDeployerAbi from '../../abi/MonadDeployer.json';
import buildTransactionRequest from '../utils/txConfig';

export interface TokenParams {
    name: string;
    symbol: string;
    tokenURI: string;
    initialSupply: bigint;
    dev: string;
    supplyToDev: bigint;
}

export interface PoolParams {
    nativeTokenAmount: bigint;
    sizePrecision: bigint;
    pricePrecision: bigint;
    tickSize: bigint;
    minSize: bigint;
    maxSize: bigint;
    takerFeeBps: number;
    makerFeeBps: number;
}

export class MonadDeployer {
    static async constructDeployTokenAndMarketTransaction(
        signer: ethers.AbstractSigner,
        deployerAddress: string,
        tokenParams: TokenParams,
        marketParams: PoolParams,
        txOptions?: TransactionOptions,
    ): Promise<ethers.TransactionRequest> {
        const address = await signer.getAddress();
        const deployer = new ethers.Contract(deployerAddress, monadDeployerAbi.abi, signer);

        // Get the kuruCollectiveFee
        const kuruCollectiveFee = await deployer.kuruCollectiveFee();

        const deployerInterface = new ethers.Interface(monadDeployerAbi.abi);
        const data = deployerInterface.encodeFunctionData('deployTokenAndMarket', [tokenParams, marketParams]);

        return buildTransactionRequest({
            from: address,
            to: deployerAddress,
            data,
            value: marketParams.nativeTokenAmount + kuruCollectiveFee,
            signer,
            txOptions,
        });
    }

    async deployTokenAndMarket(
        signer: ethers.AbstractSigner,
        deployerAddress: string,
        tokenParams: TokenParams,
        marketParams: PoolParams,
        txOptions?: TransactionOptions,
    ): Promise<{ tokenAddress: string; marketAddress: string; hash: string }> {
        const deployer = new ethers.Contract(deployerAddress, monadDeployerAbi.abi, signer);

        try {
            const tx = await MonadDeployer.constructDeployTokenAndMarketTransaction(
                signer,
                deployerAddress,
                tokenParams,
                marketParams,
                txOptions,
            );

            const transaction = await signer.sendTransaction(tx);
            const receipt = await transaction.wait(1);

            if (!receipt) {
                throw new Error('Transaction receipt is null');
            }

            const pumpingTimeLog = receipt.logs.find((log) => {
                try {
                    const parsedLog = deployer.interface.parseLog(log);
                    return parsedLog && parsedLog.name === 'PumpingTime';
                } catch {
                    return false;
                }
            });

            if (!pumpingTimeLog) {
                throw new Error('PumpingTime event not found in transaction receipt');
            }

            const parsedLog = deployer.interface.parseLog(pumpingTimeLog);

            if (!parsedLog) {
                throw new Error('Failed to parse PumpingTime event log');
            }

            return {
                tokenAddress: parsedLog.args.token,
                marketAddress: parsedLog.args.market,
                hash: receipt.hash,
            };
        } catch (e: any) {
            console.log({ e });
            if (!e.error) {
                throw e;
            }
            throw extractErrorMessage(e);
        }
    }
}
