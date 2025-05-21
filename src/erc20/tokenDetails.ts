import { ethers } from 'ethers';
import KuruUtilsABI from '../../abi/KuruUtils.json';
import { TokenInfo } from '../types';

export abstract class TokenDetailsReader {
    /**
     * @dev Gets details for multiple tokens for a specific holder
     * @param provider - The ethers.js provider to interact with the blockchain
     * @param kuruUtilsAddress - The address of the KuruUtils contract
     * @param tokens - Array of token addresses to query
     * @param holder - Address of the token holder
     * @returns Promise resolving to an array of TokenInfo objects
     */
    static async getTokensInfo(
        providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
        kuruUtilsAddress: string,
        tokens: string[],
        holder: string,
    ): Promise<TokenInfo[]> {
        const kuruUtils = new ethers.Contract(kuruUtilsAddress, KuruUtilsABI.abi, providerOrSigner);

        const result = await kuruUtils.getTokensInfo(tokens, holder);

        return result.map((info: any) => ({
            name: info.name,
            symbol: info.symbol,
            balance: info.balance.toString(),
            decimals: info.decimals,
            totalSupply: info.totalSupply.toString(),
        }));
    }
}
