import { ethers } from 'ethers';
import { Contract } from 'ethers';

import erc20Abi from "../../abi/IERC20.json";
import marginAccountAbi from "../../abi/MarginAccount.json";

require('dotenv').config();

export class MarginAccountClient {
    private provider: ethers.JsonRpcProvider;
    private wallet: ethers.Wallet;
    private marginAccount: Contract;

    constructor(
        privateKey: string,
        rpcUrl: string,
		marginAccountAddress: string,
    ) {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.marginAccount = new ethers.Contract(
            marginAccountAddress,
            marginAccountAbi.abi,
            this.wallet
        );
    }

    async approveToken(tokenContractAddress: string, amount: number, decimals: number): Promise<void> {
        const tokenContract = new ethers.Contract(
            tokenContractAddress,
            erc20Abi.abi,
            this.wallet,
        )

        const formattedAmount = ethers.parseUnits(amount.toString(), decimals);
        const tx = await tokenContract.approve(this.marginAccount.getAddress(), formattedAmount);
        await tx.wait();
        console.log(`Approval successful for ${formattedAmount.toString()} tokens`);
    }

    async deposit(userAddress: string, tokenAddress: string, amount: number, decimals: number): Promise<void> {
        const formattedAmount = ethers.parseUnits(amount.toString(), decimals);

        if (tokenAddress === ethers.ZeroAddress) { // Assuming ETH is the zero address
            const tx = await this.marginAccount.deposit(userAddress, tokenAddress, formattedAmount, { value: formattedAmount });
            await tx.wait();
            console.log('ETH Deposit successful:', tx);
        } else {
            await this.approveToken(tokenAddress, amount, decimals);
            const tx = await this.marginAccount.deposit(userAddress, tokenAddress, formattedAmount);
            await tx.wait();
            console.log('Token Deposit successful:', tx);
        }
    }

    async withdraw(amount: number, tokenAddress: string, decimals: number): Promise<void> {
        const formattedAmount = ethers.parseUnits(amount.toString(), decimals);
        const tx = await this.marginAccount.withdraw(formattedAmount, tokenAddress);
        await tx.wait();
        console.log('Withdraw successful:', tx);
    }

    async getBalance(userAddress: string, tokenAddress: string): Promise<number> {
        const balance = await this.marginAccount.getBalance(userAddress, tokenAddress);
        console.log(`Balance for ${userAddress}: ${ethers.formatEther(balance)} tokens`);
        return parseFloat(ethers.formatEther(balance));
    }
}
