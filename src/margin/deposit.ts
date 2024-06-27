// ============ External Imports ============
import { ethers } from "ethers";

// ============ Internal Imports ============
import { extractErrorMessage } from "../utils";

// ============ Config Imports ============
import erc20Abi from "../../abi/IERC20.json";
import marginAccountAbi from "../../abi/MarginAccount.json";

export abstract class MarginDeposit {
    static async deposit(
        providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
        marginAccountAddress: string,
        userAddress: string,
        tokenAddress: string,
        amount: number,
        decimals: number
    ): Promise<void> {
        try {
            const tokenContract = new ethers.Contract(tokenAddress, erc20Abi.abi, providerOrSigner);
            const marginAccount = new ethers.Contract(marginAccountAddress, marginAccountAbi.abi, providerOrSigner);
    
            const formattedAmount = ethers.utils.parseUnits(amount.toString(), decimals);
    
            if (tokenAddress === ethers.constants.AddressZero) {
                const tx = await marginAccount.deposit(userAddress, tokenAddress, formattedAmount, { value: formattedAmount });
                await tx.wait();
            } else {
                await approveToken(
                    tokenContract,
                    marginAccountAddress,
                    amount,
                    decimals
                );
    
                const tx = await marginAccount.deposit(userAddress, tokenAddress, formattedAmount);
                await tx.wait();
            }
        } catch (e: any) {
            if (!e.error) {
                throw e;
            }
            throw extractErrorMessage(e.error.body);
        }
    }
}

// ======================== INTERNAL HELPER FUNCTIONS ========================

async function approveToken(
    tokenContract: ethers.Contract,
    marginAccountAddress: string,
    amount: number,
    decimals: number
): Promise<void> {
    try {
        const formattedAmount = ethers.utils.parseUnits(amount.toString(), decimals);
        const tx = await tokenContract.approve(marginAccountAddress, formattedAmount);
        await tx.wait();
    } catch (e: any) {
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e.error.body);

    }
}