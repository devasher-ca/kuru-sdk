// ============ External Imports ============
import { BigNumberish } from 'ethers';

/**
 * @dev Calculates the base-10 logarithm of a BigNumber.
 * @param bn - The BigNumber to calculate the logarithm of.
 * @returns The base-10 logarithm of the BigNumber.
 */
export function log10BigNumber(bn: BigNumberish): number {
    if (bn === 0) {
        throw new Error('Log10 of zero is undefined');
    }

    const bnString = bn.toString();
    return bnString.length - 1;
}

export function mulDivRound(value: BigNumberish, multiplier: BigNumberish, divisor: BigNumberish): bigint {
    // Convert all inputs to bigint for arithmetic operations
    const valueBigInt = BigInt(value.toString());
    const multiplierBigInt = BigInt(multiplier.toString());
    const divisorBigInt = BigInt(divisor.toString());

    const product = valueBigInt * multiplierBigInt;
    const halfDenominator = divisorBigInt / BigInt(2);
    return (product + halfDenominator) / divisorBigInt;
}

export function clipToDecimals(value: string, decimals: number): string {
    const [integer, decimal] = value.split('.');
    if (decimal) {
        return `${integer}.${decimal.slice(0, decimals)}`;
    }
    return value;
}
