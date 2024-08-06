import { ethers } from "ethers";

import IERC20 from "../../abi/IERC20.json";

export class ERC20 {
    private contract: ethers.Contract;

    constructor(rpcUrl: string, contractAddress: string) {
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        this.contract = new ethers.Contract(
            contractAddress,
            IERC20.abi,
            provider
        );
    }

    async getTokenDetails() {
        const [name, symbol, decimals] = await Promise.all<
            [string, string, number]
        >([
            this.contract.name(),
            this.contract.symbol(),
            this.contract.decimals(),
        ]);

        return {
            name,
            symbol,
            decimals,
        };
    }
}
