// ============ External Imports ============
import { BigNumber } from "ethers";

/**
 * @dev Calculates the base-10 logarithm of a BigNumber.
 * @param bn - The BigNumber to calculate the logarithm of.
 * @returns The base-10 logarithm of the BigNumber.
 */
export function log10BigNumber(bn: BigNumber): number {
    if (bn.isZero()) {
        throw new Error("Log10 of zero is undefined");
    }

    const bnString = bn.toString();
    return bnString.length - 1;
}