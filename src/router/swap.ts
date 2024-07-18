// ============ External Imports ============
import { ethers, BigNumber } from "ethers";

// ============ Internal Imports ============
import { extractErrorMessage } from "../utils";
import { RouteOutput } from "../types/pool";

// ============ Config Imports ============
import erc20Abi from "../../abi/IERC20.json";
import routerAbi from "../../abi/Router.json";

export abstract class TokenSwap {
    static async swap(
        providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
        routerAddress: string,
        routeOutput: RouteOutput,
        amountIn: number,
        inTokenDecimals: number,
        outTokenDecimals: number,
        slippageTolerance: number,
    ): Promise<void> {
        try {
            const router = new ethers.Contract(routerAddress, routerAbi.abi, providerOrSigner);
    
            const tokenContract = new ethers.Contract(routeOutput.route.tokenIn, erc20Abi.abi, providerOrSigner);
        
            const tokenInAmount = ethers.utils.parseUnits(
                amountIn.toString(),
                inTokenDecimals
            );
        
            const minTokenOutAmount = ethers.utils.parseUnits(
                (routeOutput.output * (100 - slippageTolerance) / 100).toString(),
                outTokenDecimals
            );
        
            await approveToken(
                tokenContract,
                routerAddress,
                tokenInAmount
            );
        
            const tx = await router.anyToAnySwap(
                routeOutput.route.path.map(pool => pool.orderbook),
                routeOutput.isBuy,
                routeOutput.route.tokenIn,
                routeOutput.route.tokenOut,
                tokenInAmount,
                minTokenOutAmount
            );

            await tx.wait();
        } catch (e: any) {
            if (!e.error) {
                throw e;
            }
            throw extractErrorMessage(e.error.error.body);
        }
    }
}

/**
 * @dev Approves a token for spending by the router contract.
 * @param tokenContract - The token contract instance.
 * @param marketAddress - The address of the router contract.
 * @param size - The amount of tokens to approve.
 * @returns A promise that resolves when the transaction is confirmed.
 */
async function approveToken(
    tokenContract: ethers.Contract,
    routerAddress: string,
    size: BigNumber
): Promise<void> {
    try {
        const tx = await tokenContract.approve(
            routerAddress,
            size
        );
        await tx.wait();
    } catch (e: any) {
        if (!e.error) {
            throw e;
        }
        throw extractErrorMessage(e.error.error.body);
    }
}
