// ============ External Imports ============
import { ethers, ZeroAddress, parseUnits, TransactionReceipt } from 'ethers';
import { VaultParamFetcher } from './params';
import { MarketParams, TransactionOptions, VaultParams } from 'src/types';

// ============ Internal Imports ============
import { getTokenDecimals, approveToken } from '../utils';
import vaultAbi from '../../abi/Vault.json';
import marginAbi from '../../abi/MarginAccount.json';
import erc20Abi from '../../abi/IERC20.json';
import buildTransactionRequest from '../utils/txConfig';

export abstract class Vault {
    static async deposit(
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
        ammVaultAddress: string,
        amount1: bigint,
        amount2: bigint,
        receiver: string,
    ): Promise<TransactionReceipt> {
        const vaultContract = new ethers.Contract(ammVaultAddress, vaultAbi.abi, providerOrSigner);

        const tx = await vaultContract.deposit(amount1, amount2, receiver);
        const receipt = await tx.wait();
        if (!receipt) {
            throw new Error('Transaction failed');
        }
        return receipt;
    }

    static async withdraw(
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
        shares: bigint,
        receiver: string,
        owner: string,
    ): Promise<TransactionReceipt> {
        const vaultContract = new ethers.Contract(owner, vaultAbi.abi, providerOrSigner);

        const tx = await vaultContract.withdraw(shares, receiver, owner);
        const receipt = await tx.wait();
        if (!receipt) {
            throw new Error('Transaction failed');
        }
        return receipt;
    }

    /**
     * Return the shares owned by an address in a vault
     * @param vaultAddress The address of vault contract
     * @param signer The signer to use for the transaction
     * @returns A promise resolving to the number of shares of an address in a vault
     */

    static async getVaultShares(
        vaultAddress: string,
        userAddress: string,
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
    ): Promise<bigint> {
        const vaultContract = new ethers.Contract(vaultAddress, vaultAbi.abi, providerOrSigner);
        return await vaultContract.balanceOf(userAddress, {
            from: ZeroAddress,
        });
    }

    /**
     *
     * @param vaultAddress The address of the vault contract
     * @param marketAddress The address of the market contract
     * @param marginAccountAddress The address of the margin account contract
     * @param providerOrSigner The provider or signer to use for the transaction
     * @returns A promise that resolves to an object containing token1 and token2 address and balance
     */

    static async getVaultLiquidity(
        vaultAddress: string,
        baseAssetAddress: string,
        quoteAssetAddress: string,
        marginAccountAddress: string,
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
    ) {
        const marginAccountContract = new ethers.Contract(marginAccountAddress, marginAbi.abi, providerOrSigner);

        const token1 = await marginAccountContract.getBalance(vaultAddress, baseAssetAddress, {
            from: ZeroAddress,
        });
        const token2 = await marginAccountContract.getBalance(vaultAddress, quoteAssetAddress, {
            from: ZeroAddress,
        });

        return {
            token1: {
                address: baseAssetAddress,
                balance: token1,
            },
            token2: {
                address: quoteAssetAddress,
                balance: token2,
            },
        };
    }

    /**
     * Calculate the amount of tokens needed to deposit for a given number of shares
     * @param shares The number of shares to mint
     * @param vaultAddress The address of the vault contract
     * @param providerOrSigner The provider or signer to use for the transaction
     * @returns A promise that resolves to an object containing amount1 and amount2
     */
    static async calculateDepositForShares(
        shares: bigint,
        vaultAddress: string,
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
    ): Promise<{ amount1: bigint; amount2: bigint }> {
        const vaultContract = new ethers.Contract(vaultAddress, vaultAbi.abi, providerOrSigner);
        const [amount1, amount2] = await vaultContract.previewMint(shares, {
            from: ZeroAddress,
        });
        return { amount1, amount2 };
    }

    /**
     * Calculate the amount of tokens to be received for a given number of shares to withdraw
     * @param shares The number of shares to burn
     * @param vaultAddress The address of the vault contract
     * @param providerOrSigner The provider or signer to use for the transaction
     * @returns A promise that resolves to an object containing amount1 and amount2
     */
    static async calculateWithdrawForShares(
        shares: bigint,
        vaultAddress: string,
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
    ): Promise<{ amount1: bigint; amount2: bigint }> {
        const vaultContract = new ethers.Contract(vaultAddress, vaultAbi.abi, providerOrSigner);
        const [amount1, amount2] = await vaultContract.previewRedeem(shares, {
            from: ZeroAddress,
        });
        return { amount1, amount2 };
    }

    /**
     * Calculate the number of shares to be received for a given deposit of tokens
     * @param amount1 The amount of token1 to deposit
     * @param amount2 The amount of token2 to deposit
     * @param vaultAddress The address of the vault contract
     * @param providerOrSigner The provider or signer to use for the transaction
     * @returns A promise that resolves to the number of shares
     */
    static async calculateSharesForDeposit(
        amount1: bigint,
        amount2: bigint,
        vaultAddress: string,
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
    ): Promise<bigint> {
        const vaultContract = new ethers.Contract(vaultAddress, vaultAbi.abi, providerOrSigner);
        return await vaultContract.previewDeposit(amount1, amount2, {
            from: ZeroAddress,
        });
    }

    /**
     * Calculate the amount of token2 needed for a specific amount of token1 based on current price
     * @param amount1 The amount of token1
     * @param marketAddress The address of the market contract
     * @param providerOrSigner The provider or signer to use for the transaction
     * @returns A promise that resolves to the amount of token2 needed
     */
    static async calculateAmount2ForAmount1(
        amount1: bigint,
        marketAddress: string,
        marketParams: MarketParams,
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
    ): Promise<bigint> {
        const vaultParams: VaultParams = await VaultParamFetcher.getVaultParams(providerOrSigner, marketAddress);
        const price = vaultParams.vaultBestAsk;
        const token1Decimals = await getTokenDecimals(marketParams.baseAssetAddress, providerOrSigner);
        const token2Decimals = await getTokenDecimals(marketParams.quoteAssetAddress, providerOrSigner);
        //amount2 = (amount1 * price * 10^token2Decimals) / (10^token1Decimals * 10^18)
        return (
            (amount1 * BigInt(price) * BigInt(parseUnits('1', token2Decimals))) /
            (BigInt(parseUnits('1', token1Decimals)) * BigInt(parseUnits('1', 18)))
        );
    }

    /**
     * Calculate the amount of token1 needed for a specific amount of token2 based on current price
     * @param amount2 The amount of token2
     * @param marketAddress The address of the market contract
     * @param providerOrSigner The provider or signer to use for the transaction
     * @returns A promise that resolves to the amount of token1 needed
     */
    static async calculateAmount1ForAmount2(
        amount2: bigint,
        marketAddress: string,
        marketParams: MarketParams,
        providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
    ): Promise<bigint> {
        const vaultParams: VaultParams = await VaultParamFetcher.getVaultParams(providerOrSigner, marketAddress);
        const price = vaultParams.vaultBestAsk;
        const token1Decimals = await getTokenDecimals(marketParams.baseAssetAddress, providerOrSigner);
        const token2Decimals = await getTokenDecimals(marketParams.quoteAssetAddress, providerOrSigner);
        //amount1 = (amount2 * 10^token1Decimals * 10^18) / (price * 10^token2Decimals)
        return (
            (amount2 * BigInt(parseUnits('1', token1Decimals)) * BigInt(parseUnits('1', 18))) /
            (BigInt(price) * BigInt(parseUnits('1', token2Decimals)))
        );
    }

    /**
     * Deposit tokens into the vault based on the number of shares to mint
     * @param shares The number of shares to mint
     * @param marketAddress The address of the market contract
     * @param vaultAddress The address of the vault contract
     * @param signer The signer to use for the transaction
     * @param shouldApprove Whether to approve the tokens before depositing
     * @returns A promise that resolves to the transaction receipt
     */
    static async depositBasedOnShares(
        shares: bigint,
        marketParams: MarketParams,
        vaultAddress: string,
        signer: ethers.AbstractSigner,
        shouldApprove: boolean = false,
    ): Promise<TransactionReceipt> {
        const vaultContract = new ethers.Contract(vaultAddress, vaultAbi.abi, signer);
        const { amount1, amount2 } = await this.calculateDepositForShares(shares, vaultAddress, signer);
        const token1Address = marketParams.baseAssetAddress;
        const token2Address = marketParams.quoteAssetAddress;

        let overrides = {};

        if (token1Address === ZeroAddress) {
            overrides = { value: amount1 };
        } else if (shouldApprove) {
            const tokenContract = new ethers.Contract(token1Address, erc20Abi.abi, signer);
            await approveToken(tokenContract, vaultAddress, amount1, signer);
        }

        if (token2Address === ZeroAddress) {
            overrides = { value: amount2 };
        } else if (shouldApprove) {
            const tokenContract = new ethers.Contract(token2Address, erc20Abi.abi, signer);
            await approveToken(tokenContract, vaultAddress, amount2, signer);
        }

        const tx = await vaultContract.mint(shares, await signer.getAddress(), overrides);
        const receipt = await tx.wait();
        if (!receipt) {
            throw new Error('Transaction failed');
        }
        return receipt;
    }

    /**
     * Withdraw tokens from the vault based on the number of shares to burn
     * @param shares The number of shares to burn
     * @param vaultAddress The address of the vault contract
     * @param signer The signer to use for the transaction
     * @returns A promise that resolves to the transaction receipt
     */
    static async withdrawBasedOnShares(
        shares: bigint,
        vaultAddress: string,
        signer: ethers.AbstractSigner,
    ): Promise<TransactionReceipt> {
        const vaultContract = new ethers.Contract(vaultAddress, vaultAbi.abi, signer);
        const tx = await vaultContract.redeem(shares, await signer.getAddress(), await signer.getAddress());
        const receipt = await tx.wait();
        if (!receipt) {
            throw new Error('Transaction failed');
        }
        return receipt;
    }

    /**
     * Deposit tokens into the vault with given amounts of token1 and token2
     * @param amount1 The amount of token1 to deposit
     * @param amount2 The amount of token2 to deposit
     * @param marketAddress The address of the market contract
     * @param vaultAddress The address of the vault contract
     * @param signer The signer to use for the transaction
     * @param shouldApprove Whether to approve the tokens before depositing
     * @returns A promise that resolves to the transaction receipt
     */
    static async depositWithAmounts(
        amount1: bigint,
        amount2: bigint,
        baseAssetAddress: string,
        quoteAssetAddress: string,
        vaultAddress: string,
        signer: ethers.AbstractSigner,
        shouldApprove: boolean = false,
    ): Promise<TransactionReceipt> {
        const vaultContract = new ethers.Contract(vaultAddress, vaultAbi.abi, signer);

        let overrides: { value?: bigint } = {};

        if (baseAssetAddress === ZeroAddress) {
            overrides.value = amount1;
        } else if (shouldApprove) {
            const tokenContract = new ethers.Contract(baseAssetAddress, erc20Abi.abi, signer);
            await approveToken(tokenContract, vaultAddress, amount1, signer);
        }

        if (quoteAssetAddress === ZeroAddress) {
            overrides.value = amount2;
        } else if (shouldApprove) {
            const tokenContract = new ethers.Contract(quoteAssetAddress, erc20Abi.abi, signer);
            await approveToken(tokenContract, vaultAddress, amount2, signer);
        }

        const tx = await vaultContract.deposit(amount1, amount2, await signer.getAddress(), overrides);
        const receipt = await tx.wait();
        if (!receipt) {
            throw new Error('Transaction failed');
        }
        return receipt;
    }

    static async constructDepositTransaction(
        amount1: bigint,
        amount2: bigint,
        baseAssetAddress: string,
        quoteAssetAddress: string,
        vaultAddress: string,
        signer: ethers.AbstractSigner,
        txOptions?: TransactionOptions,
    ): Promise<ethers.TransactionRequest> {
        const address = await signer.getAddress();

        const vaultInterface = new ethers.Interface(vaultAbi.abi);
        const data = vaultInterface.encodeFunctionData('deposit', [amount1, amount2, address]);

        // Calculate the total value for native token deposits
        const txValue =
            baseAssetAddress === ZeroAddress ? amount1 : quoteAssetAddress === ZeroAddress ? amount2 : BigInt(0);

        return buildTransactionRequest({
            to: vaultAddress,
            from: address,
            data,
            value: txValue,
            txOptions,
            signer,
        });
    }

    static async constructWithdrawTransaction(
        shares: bigint,
        vaultAddress: string,
        signer: ethers.AbstractSigner,
        txOptions?: TransactionOptions,
    ): Promise<ethers.TransactionRequest> {
        const vaultInterface = new ethers.Interface(vaultAbi.abi);

        const fromAddress = await signer.getAddress();

        const data = vaultInterface.encodeFunctionData('withdraw', [shares, fromAddress, fromAddress]);

        return buildTransactionRequest({
            to: vaultAddress,
            from: fromAddress,
            data,
            txOptions,
            signer,
        });
    }
}
