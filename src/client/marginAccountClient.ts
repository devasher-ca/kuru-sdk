import {
    Multicall,
    ContractCallContext,
} from 'ethereum-multicall';

import { ethers } from 'ethers';
import { Contract } from 'ethers';

import {extractErrorMessage} from '../utils'

import erc20Abi from "../../abi/IERC20.json";
import marginAccountAbi from "../../abi/MarginAccount.json";

export class MarginAccountClient {
    private provider: ethers.providers.JsonRpcProvider;
    private wallet: ethers.Wallet | undefined;
    private marginAccount: Contract;

    constructor(
        privateKeyOrProvider: string | ethers.providers.JsonRpcProvider,
        rpcUrlOrMarginAccountAddress: string,
        marginAccountAddress?: string
    ) {
        if (typeof privateKeyOrProvider === 'string' && marginAccountAddress) {
            // Case 1: privateKey and rpcUrl are provided
            this.provider = new ethers.providers.JsonRpcProvider(rpcUrlOrMarginAccountAddress);
            this.wallet = new ethers.Wallet(privateKeyOrProvider, this.provider);
            this.marginAccount = new ethers.Contract(
                marginAccountAddress,
                marginAccountAbi.abi,
                this.wallet
            );
        } else if (privateKeyOrProvider instanceof ethers.providers.JsonRpcProvider) {
            // Case 2: provider and marginAccountAddress are provided
            this.provider = privateKeyOrProvider;
            this.marginAccount = new ethers.Contract(
                rpcUrlOrMarginAccountAddress,
                marginAccountAbi.abi,
                this.wallet
            );
        } else {
            throw new Error("Invalid arguments provided to constructor");
        }
    }    

    async approveToken(tokenContractAddress: string, amount: number, decimals: number): Promise<void | Error> {
        try {
            const tokenContract = new ethers.Contract(
                tokenContractAddress,
                erc20Abi.abi,
                this.wallet,
            )
    
            const formattedAmount = ethers.utils.parseUnits(amount.toString(), decimals);
            const tx = await tokenContract.approve(this.marginAccount.address, formattedAmount);
            await tx.wait();
        } catch (e: any) {
            if (!e.error) {
                return new Error(e);
            }
            return extractErrorMessage(e.error.body);

        }
    }

    async depositMulticall(userAddress: string, tokenAddress: string, amount: number, decimals: number): Promise<void> {
        const multicall = new Multicall({ ethersProvider: this.provider, tryAggregate: true });
        const formattedAmount = ethers.utils.parseUnits(amount.toString(), decimals);

        if (tokenAddress === ethers.constants.AddressZero) { // Assuming ETH is the zero address
            const tx = await this.marginAccount.deposit(userAddress, tokenAddress, formattedAmount, { value: formattedAmount });
            await tx.wait();
        } else {
            const contractCallContext: ContractCallContext[] = [
                {
                    reference: 'tokenContract',
                    contractAddress: tokenAddress,
                    abi: erc20Abi.abi,
                    calls: [{ reference: 'approveCall', methodName: 'approve', methodParameters: [this.marginAccount.address, formattedAmount] }]
                },
                {
                    reference: 'MarginAccount',
                    contractAddress: this.marginAccount.address,
                    abi: marginAccountAbi.abi,
                    calls: [{ reference: 'depositCall', methodName: 'deposit', methodParameters: [userAddress, tokenAddress, formattedAmount] }]
                }
            ];

            await multicall.call(contractCallContext);
        }
    }

    async deposit(userAddress: string, tokenAddress: string, amount: number, decimals: number): Promise<void | Error> {
        try {
            const formattedAmount = ethers.utils.parseUnits(amount.toString(), decimals);

            if (tokenAddress === ethers.constants.AddressZero) { // Assuming ETH is the zero address
                const tx = await this.marginAccount.deposit(userAddress, tokenAddress, formattedAmount, { value: formattedAmount });
                await tx.wait();
            } else {
                await this.approveToken(tokenAddress, amount, decimals);
                const tx = await this.marginAccount.deposit(userAddress, tokenAddress, formattedAmount);
                await tx.wait();
            }
        } catch (e: any) {
            if (!e.error) {
                return new Error(e);
            }
            return extractErrorMessage(e.error.body);
        }
    }

    async withdraw(amount: number, tokenAddress: string, decimals: number): Promise<void | Error> {
        try {
            const formattedAmount = ethers.utils.parseUnits(amount.toString(), decimals);
            const tx = await this.marginAccount.withdraw(formattedAmount, tokenAddress);
            await tx.wait();
        } catch (e: any) {
            if (!e.error) {
                return new Error(e);
            }
            return extractErrorMessage(e.error.body);
        }
    }

    async getBalance(userAddress: string, tokenAddress: string): Promise<number | Error> {
        try {
            const balance = await this.marginAccount.getBalance(userAddress, tokenAddress);
            return parseFloat(ethers.utils.formatEther(balance));
        } catch (e: any) {
            if (!e.error) {
                return new Error(e);
            }
            return extractErrorMessage(e.error.body);
        }
    }
}

