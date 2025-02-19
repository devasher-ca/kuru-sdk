import { ethers } from "ethers";

import { TokenInfo } from "../types";

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
        holder: string
    ): Promise<TokenInfo[]> {
        const iface = new ethers.utils.Interface([
            "function getTokensInfo(address[] tokens, address holder) view returns (tuple(string name, string symbol, uint256 balance, uint8 decimals)[])"
        ]);

        const data = iface.encodeFunctionData("getTokensInfo", [tokens, holder]);

        const result = await providerOrSigner.call({
            to: kuruUtilsAddress,
            from: ethers.constants.AddressZero,
            data
        });

        const decodedResult = iface.decodeFunctionResult("getTokensInfo", result);
        
        return decodedResult[0].map((info: any) => ({
            name: info.name,
            symbol: info.symbol,
            balance: info.balance.toString(),
            decimals: info.decimals
        }));
    }
}
