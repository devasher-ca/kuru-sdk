// ============ External Imports ============
import { BigNumber, ContractReceipt, ethers } from "ethers";

// ============ Internal Imports ============
import vaultAbi from "../../abi/Vault.json";

export abstract class Vault {
    static async deposit(
        providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
        ammVaultAddress: string,
        amount1: BigNumber,
        amount2: BigNumber,
        receiver: string
    ): Promise<ContractReceipt> {
        const contractInstance = new ethers.Contract(
            ammVaultAddress,
            vaultAbi.abi,
            providerOrSigner
        );

        const tx = await contractInstance.deposit(amount1, amount2, receiver);

        return tx.wait();
    }

    static async withdraw(
        providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
        shares: BigNumber,
        receiver: string,
        owner: string
    ): Promise<ContractReceipt> {
        const contractInstance = new ethers.Contract(
            owner,
            vaultAbi.abi,
            providerOrSigner
        );

        const tx = await contractInstance.withdraw(shares, receiver, owner);

        return tx.wait();
    }
}
