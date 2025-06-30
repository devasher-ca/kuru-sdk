// ============ External Imports ============
import { ethers, ZeroAddress } from 'ethers';
// ============ Internal Imports ============
import erc20Abi from '../../abi/IERC20.json';

export async function getTokenDecimals(
    tokenAddress: string,
    providerOrSigner: ethers.JsonRpcProvider | ethers.AbstractSigner,
): Promise<number> {
    if (tokenAddress === ZeroAddress) {
        return 18;
    }

    const contract = new ethers.Contract(tokenAddress, erc20Abi.abi, providerOrSigner);
    return await contract.decimals();
}
