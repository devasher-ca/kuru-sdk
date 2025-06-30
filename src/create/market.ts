// ============ External Imports ============
import { ethers, parseUnits } from 'ethers';

// ============ Internal Imports ============
import { TransactionOptions } from 'src/types';
import { extractErrorMessage } from '../utils';

// ============ Config Imports ============
import routerAbi from '../../abi/Router.json';
import buildTransactionRequest from '../utils/txConfig';

export class ParamCreator {
    static DEFAULT_PRICE_PRECISION_DECIMALS = 4;

    static async constructDeployMarketTransaction(
        signer: ethers.AbstractSigner,
        routerAddress: string,
        type: number,
        baseAssetAddress: string,
        quoteAssetAddress: string,
        sizePrecision: bigint,
        pricePrecision: bigint,
        tickSize: bigint,
        minSize: bigint,
        maxSize: bigint,
        takerFeeBps: number,
        makerFeeBps: number,
        kuruAmmSpread: bigint,
        txOptions?: TransactionOptions,
    ): Promise<ethers.TransactionRequest> {
        const address = await signer.getAddress();

        const routerInterface = new ethers.Interface(routerAbi.abi);
        const data = routerInterface.encodeFunctionData('deployProxy', [
            type,
            baseAssetAddress,
            quoteAssetAddress,
            sizePrecision,
            pricePrecision,
            tickSize,
            minSize,
            maxSize,
            takerFeeBps,
            makerFeeBps,
            kuruAmmSpread,
        ]);

        return buildTransactionRequest({
            from: address,
            to: routerAddress,
            signer,
            data,
            txOptions,
        });
    }

    async deployMarket(
        signer: ethers.AbstractSigner,
        routerAddress: string,
        type: number,
        baseAssetAddress: string,
        quoteAssetAddress: string,
        sizePrecision: bigint,
        pricePrecision: bigint,
        tickSize: bigint,
        minSize: bigint,
        maxSize: bigint,
        takerFeeBps: number,
        makerFeeBps: number,
        kuruAmmSpread: bigint,
        txOptions?: TransactionOptions,
    ): Promise<string> {
        const router = new ethers.Contract(routerAddress, routerAbi.abi, signer);

        try {
            const tx = await ParamCreator.constructDeployMarketTransaction(
                signer,
                routerAddress,
                type,
                baseAssetAddress,
                quoteAssetAddress,
                sizePrecision,
                pricePrecision,
                tickSize,
                minSize,
                maxSize,
                takerFeeBps,
                makerFeeBps,
                kuruAmmSpread,
                txOptions,
            );

            const transaction = await signer.sendTransaction(tx);
            const receipt = await transaction.wait(1);

            if (!receipt) {
                throw new Error('Transaction failed');
            }

            const marketRegisteredLog = receipt.logs.find((log) => {
                try {
                    const parsedLog = router.interface.parseLog(log);
                    return parsedLog && parsedLog.name === 'MarketRegistered';
                } catch {
                    return false;
                }
            });

            if (!marketRegisteredLog) {
                throw new Error('MarketRegistered event not found in transaction receipt');
            }

            const parsedLog = router.interface.parseLog(marketRegisteredLog);
            if (!parsedLog) {
                throw new Error('Failed to parse MarketRegistered event');
            }
            return parsedLog.args.market;
        } catch (e: any) {
            console.log({ e });
            if (!e.error) {
                throw e;
            }
            throw extractErrorMessage(e);
        }
    }

    calculatePrecisions(quote: number, base: number, maxPrice: number, minSize: number, tickSizeBps: number = 10) {
        let currentPrice = quote / base;

        // Calculate tick size based on BPS but ensure minimum tick size
        let tickSize = Math.max(
            currentPrice * (tickSizeBps / 10000), // BPS-based tick size
            currentPrice / 1000000, // Minimum tick size (1 millionth of price)
            0.00000001, // Absolute minimum tick size
        );

        // Convert to fixed notation with max 9 decimals
        const tickStr = tickSize.toFixed(9);

        // Convert to string with high precision to detect patterns
        const priceStr = currentPrice.toFixed(9);

        // Look for recurring patterns in the decimal part
        const decimalPart = priceStr.split('.')[1];
        if (decimalPart) {
            // Skip leading zeros before looking for patterns
            let significantStart = 0;
            while (significantStart < decimalPart.length && decimalPart[significantStart] === '0') {
                significantStart++;
            }

            // Find recurring pattern in the significant digits
            const significantPart = decimalPart.slice(significantStart);
            for (let len = 1; len <= 4; len++) {
                const pattern = significantPart.slice(0, len);
                const nextPattern = significantPart.slice(len, len * 2);
                if (pattern === nextPattern && pattern !== '0') {
                    // Add check to ignore '0' pattern
                    // Found a recurring pattern, limit it to 2 repetitions
                    const limitedDecimal = decimalPart.slice(0, significantStart) + pattern.repeat(2);
                    const newPrice = `${priceStr.split('.')[0]}.${limitedDecimal}`;
                    currentPrice = Number(newPrice);
                    break;
                }
            }
        }

        if (currentPrice === 0 || !currentPrice) {
            throw new Error(`Current price is too low: ${currentPrice}`);
        }

        // Handle recurring decimals in tick size the same way
        const tickDecimalPart = tickStr.split('.')[1];
        if (tickDecimalPart) {
            let significantStart = 0;
            while (significantStart < tickDecimalPart.length && tickDecimalPart[significantStart] === '0') {
                significantStart++;
            }

            const significantPart = tickDecimalPart.slice(significantStart);
            for (let len = 1; len <= 4; len++) {
                const pattern = significantPart.slice(0, len);
                const nextPattern = significantPart.slice(len, len * 2);
                if (pattern === nextPattern && pattern !== '0') {
                    const limitedDecimal = tickDecimalPart.slice(0, significantStart) + pattern.repeat(2);
                    const newTick = `${tickStr.split('.')[0]}.${limitedDecimal}`;
                    tickSize = Number(newTick);
                    break;
                }
            }
        }
        // Use the string representation to count decimals
        const priceDecimals = Math.max(
            this.countDecimals(Number(priceStr)),
            ParamCreator.DEFAULT_PRICE_PRECISION_DECIMALS,
            this.countDecimals(Number(tickStr)),
        );

        if (priceDecimals > 9) {
            throw new Error('Price precision exceeds maximum (9 decimals)');
        }

        // Use the fixed notation strings for further calculations
        const pricePrecision = BigInt(Math.pow(10, priceDecimals));
        const tickSizeInPrecision = parseUnits(tickStr, priceDecimals);

        // Calculate size precision based on max price * price precision
        const maxPriceWithPrecision = maxPrice * Math.pow(10, priceDecimals);
        const sizeDecimalsPower = Math.floor(Math.log10(maxPriceWithPrecision));
        const sizeDecimals = Math.max(this.countDecimals(minSize), sizeDecimalsPower);
        const sizePrecision = BigInt(Math.pow(10, sizeDecimals));

        const maxSizeInPrecision = this.getMaxSizeAtPrice(
            parseUnits(currentPrice.toFixed(priceDecimals), priceDecimals),
            sizePrecision,
        );
        const minSizeInPrecision = parseUnits(minSize.toString(), sizeDecimals);
        return {
            pricePrecision: pricePrecision,
            sizePrecision: sizePrecision,
            tickSize: BigInt(tickSizeInPrecision),
            minSize: BigInt(minSizeInPrecision),
            maxSize: maxSizeInPrecision,
        };
    }

    getPricePrecision(currentPrice: number, maxPrice: number): { precision: number } | { error: string } {
        const currentDecimals = this.countDecimals(currentPrice);
        const maxDecimals = this.countDecimals(maxPrice);

        const neededPrecision = Math.max(currentDecimals, maxDecimals);

        if (neededPrecision > 8) {
            return { error: 'Price is greater than 10**9' };
        }

        return { precision: Math.pow(10, neededPrecision) };
    }

    getSizePrecision(maxPriceInPricePrecision: bigint): { precision: number } | { error: string } {
        const numDigits = maxPriceInPricePrecision.toString().length;

        return { precision: Math.pow(10, numDigits) };
    }

    getMinAndMaxPrice(pricePrecision: number): {
        minPrice: number;
        maxPrice: number;
    } {
        const minPrice = 1 / pricePrecision;
        const maxPrice = 10 ** 9;

        return { minPrice, maxPrice };
    }

    getMaxSizeAtPrice(price: bigint, sizePrecision: bigint): bigint {
        const UINT32_MAX = BigInt(2) ** BigInt(32) - BigInt(1);
        const rawMaxSize = (UINT32_MAX * sizePrecision) / price;
        // Convert to string to count digits
        const numDigits = rawMaxSize.toString().length;

        // Calculate nearest power of 10 (rounding down)
        const maxSize = BigInt(10) ** BigInt(numDigits - 1);

        return maxSize;
    }

    calculateMarketCap(price: number, base: number, solPrice: number): string {
        const marketCap = price * base * solPrice * 2;

        if (marketCap >= 1_000_000_000) {
            return `${(marketCap / 1_000_000_000).toFixed(1)}b`;
        } else if (marketCap >= 1_000_000) {
            return `${(marketCap / 1_000_000).toFixed(1)}m`;
        } else if (marketCap >= 1_000) {
            return `${(marketCap / 1_000).toFixed(1)}k`;
        }
        return `${marketCap.toFixed(1)}`;
    }

    private countDecimals(value: number): number {
        if (value === 0) return 0;

        // Convert to string and remove scientific notation
        let str = value.toString();
        if (str.includes('e')) {
            const [_base, exponent] = str.split('e');
            const exp = parseInt(exponent);
            if (exp < 0) {
                // For negative exponents (small decimals)
                return Math.abs(exp);
            } else {
                // For positive exponents (large numbers)
                str = value.toLocaleString('fullwide', { useGrouping: false });
            }
        }

        // If no decimal point, return 0
        if (!str.includes('.')) return 0;

        // Split on decimal and get length of decimal portion
        const decimalPart = str.split('.')[1];
        return decimalPart ? decimalPart.length : 0;
    }
}
