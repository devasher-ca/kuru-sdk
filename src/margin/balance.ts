// ============ External Imports ============
import { BigNumber, ethers } from 'ethers';

// ============ Internal Imports ============
import { extractErrorMessage } from '../utils';

// ============ Config Imports ============
import marginAccountAbi from '../../abi/MarginAccount.json';

export abstract class MarginBalance {
    static async getBalance(
        providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
        marginAccountAddress: string,
        userAddress: string,
        tokenAddress: string,
    ): Promise<BigNumber> {
        try {
            const marginAccount = new ethers.Contract(marginAccountAddress, marginAccountAbi.abi, providerOrSigner);

            return await marginAccount.getBalance(userAddress, tokenAddress, { from: ethers.constants.AddressZero });
        } catch (e: any) {
            if (!e.error) {
                throw e;
            }
            throw extractErrorMessage(e);
        }
    }
}
