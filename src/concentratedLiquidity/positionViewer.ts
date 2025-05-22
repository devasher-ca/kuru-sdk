// ============ Types ============
export interface BatchLPDetails {
    bids: Position[];
    asks: Position[];
    quoteLiquidity: bigint;
    baseLiquidity: bigint;
}

export interface Position {
    price: bigint;
    flipPrice: bigint;
    liquidity: bigint;
}

const FEE_DENOMINATOR = BigInt(10000);

export abstract class PositionViewer {
    /**
     * @dev Retrieves details for concentrated liquidity positions within a price range.
     * @param minFeesBps - The minimum fees to filter positions by.
     * @param startPrice - The lower bound of the price range to query.
     * @param endPrice - The upper bound of the price range to query.
     * @param bestAskPrice - The current market price.
     * @param pricePrecision - The precision of the price.
     * @param tickSize - The size of a tick.
     * @param quoteLiquidity - The total quote liquidity in the market.
     * @param baseLiquidity - The total base liquidity in the market.
     * @returns A promise that resolves to the batch order details.
     */
    static async getSpotBatchLPDetails(
        minFeesBps: bigint,
        startPrice: bigint,
        endPrice: bigint,
        bestAskPrice: bigint,
        pricePrecision: bigint,
        sizePrecision: bigint,
        quoteAssetDecimals: bigint,
        baseAssetDecimals: bigint,
        tickSize: bigint,
        minSize: bigint,
        quoteLiquidity?: bigint, // In quote asset decimals
        baseLiquidity?: bigint, // In base asset decimals
    ): Promise<BatchLPDetails> {
        // don't allow both quoteLiquidity and baseLiquidity to be undefined
        if (quoteLiquidity === undefined && baseLiquidity === undefined) {
            throw new Error('quoteLiquidity and baseLiquidity cannot be undefined');
        }

        startPrice = startPrice - (startPrice % tickSize);

        var numBids: bigint = BigInt(0);
        var numAsks: bigint = BigInt(0);
        const bids: Position[] = [];
        const asks: Position[] = [];

        while (startPrice < bestAskPrice) {
            numBids++;
            var nextPrice = (startPrice * (FEE_DENOMINATOR + minFeesBps)) / FEE_DENOMINATOR;
            if (nextPrice == startPrice) {
                nextPrice = startPrice + tickSize;
            }
            nextPrice = nextPrice - (nextPrice % tickSize);

            const position = {
                price: startPrice,
                liquidity: BigInt(0),
                flipPrice: nextPrice,
            };
            bids.push(position);

            startPrice = nextPrice;
        }

        while (startPrice < endPrice) {
            numAsks++;
            var nextPrice = (startPrice * (FEE_DENOMINATOR + minFeesBps)) / FEE_DENOMINATOR;
            if (nextPrice == startPrice) {
                nextPrice = startPrice + tickSize;
            }
            nextPrice = nextPrice - (nextPrice % tickSize);

            const position = {
                price: nextPrice,
                liquidity: BigInt(0),
                flipPrice: startPrice,
            };
            asks.push(position);

            startPrice = nextPrice;
        }

        if (quoteLiquidity !== undefined && baseLiquidity == undefined) {
            baseLiquidity = BigInt(0);
            const quotePerTick = quoteLiquidity / numBids;

            for (const bid of bids) {
                bid.liquidity =
                    (quotePerTick * sizePrecision * pricePrecision) / (bid.price * BigInt(10) ** quoteAssetDecimals);
                if (bid.liquidity < minSize) {
                    throw new Error('bid liquidity is less than minSize');
                }
            }

            for (const ask of asks) {
                ask.liquidity =
                    (quotePerTick * sizePrecision * pricePrecision) / (ask.price * BigInt(10) ** quoteAssetDecimals);
                baseLiquidity += (ask.liquidity * BigInt(10) ** baseAssetDecimals) / sizePrecision;
                if (ask.liquidity < minSize) {
                    throw new Error('ask liquidity is less than minSize');
                }
            }

            return {
                bids: bids.sort((a, b) => Number(b.price - a.price)),
                asks: asks.sort((a, b) => Number(b.price - a.price)),
                quoteLiquidity: quoteLiquidity ?? BigInt(0),
                baseLiquidity: baseLiquidity ?? BigInt(0),
            };
        }

        if (baseLiquidity !== undefined && quoteLiquidity == undefined) {
            // We have total base liquidity but need to infer the amount of quote
            // per price-point (i.e. quotePerTick) such that each bid/ask bucket
            // receives the same amount of quote.  The relationship between the
            // base size at the first ask (b₁) and the total base B is
            //   B = Σ_{i=1}^{N} (b₁ * p₁) / p_i
            // Solving for the constant quotePerTick = b₁ * p₁ gives
            //   quotePerTick = B / (Σ 1/p_i)
            // We implement this in integer arithmetic by scaling the reciprocal
            // terms with `pricePrecision ** 2` so that we avoid fractional
            // values while maintaining precision.

            // ------------------------------------------
            // 1. Compute the scaled reciprocal sum Σ pricePrecision^2 / p_i
            // ------------------------------------------
            const reciprocalSumScaled = asks.reduce(
                (sum, ask) => sum + (pricePrecision * pricePrecision) / ask.price,
                BigInt(0),
            );

            if (reciprocalSumScaled === BigInt(0)) {
                throw new Error('reciprocalSumScaled is zero – check price inputs');
            }

            // ------------------------------------------
            // 2. Compute ask liquidity in sizePrecision units
            //    Formula: L_i = (B * sizePrecision * pricePrecision^2) /
            //                     (ΣRecipScaled * p_i * 10^{baseDecimals})
            // ------------------------------------------
            for (const ask of asks) {
                ask.liquidity =
                    (baseLiquidity * sizePrecision * pricePrecision * pricePrecision) /
                    (reciprocalSumScaled * ask.price * BigInt(10) ** baseAssetDecimals);

                if (ask.liquidity < minSize) {
                    throw new Error('ask liquidity is less than minSize');
                }
            }

            // ------------------------------------------
            // 3. Derive the constant quotePerTick from the first ask bucket.
            //    quotePerTick = L_1 * p_1 * 10^{quoteDecimals} / (sizePrecision * pricePrecision)
            // ------------------------------------------
            const firstAsk = asks[0];
            const quotePerTick =
                (firstAsk.liquidity * firstAsk.price * BigInt(10) ** quoteAssetDecimals) /
                (sizePrecision * pricePrecision);

            // ------------------------------------------
            // 4. Allocate liquidity for bids (inverse conversion)
            //    L_bid = quotePerTick * sizePrecision * pricePrecision /
            //            (p_bid * 10^{quoteDecimals})
            // ------------------------------------------
            let inferredQuoteLiquidity: bigint = BigInt(0);

            for (const bid of bids) {
                bid.liquidity =
                    (quotePerTick * sizePrecision * pricePrecision) / (bid.price * BigInt(10) ** quoteAssetDecimals);

                inferredQuoteLiquidity += quotePerTick; // one quotePerTick per bid

                if (bid.liquidity < minSize) {
                    throw new Error('bid liquidity is less than minSize');
                }
            }

            return {
                bids: bids.sort((a, b) => Number(b.price - a.price)),
                asks: asks.sort((a, b) => Number(b.price - a.price)),
                quoteLiquidity: inferredQuoteLiquidity,
                baseLiquidity: baseLiquidity,
            };
        }

        if (baseLiquidity !== undefined && quoteLiquidity !== undefined) {
            for (const ask of asks) {
                ask.liquidity = (baseLiquidity * sizePrecision) / (numAsks * BigInt(10) ** baseAssetDecimals);
                if (ask.liquidity < minSize) {
                    throw new Error('ask liquidity is less than minSize');
                }
            }

            for (const bid of bids) {
                bid.liquidity =
                    (quoteLiquidity * sizePrecision * pricePrecision) /
                    (numBids * bid.price * BigInt(10) ** quoteAssetDecimals);
                if (bid.liquidity < minSize) {
                    throw new Error('bid liquidity is less than minSize');
                }
            }

            return {
                bids: bids.sort((a, b) => Number(b.price - a.price)),
                asks: asks.sort((a, b) => Number(b.price - a.price)),
                quoteLiquidity: quoteLiquidity ?? BigInt(0),
                baseLiquidity: baseLiquidity ?? BigInt(0),
            };
        }

        return {
            bids: [],
            asks: [],
            quoteLiquidity: BigInt(0),
            baseLiquidity: BigInt(0),
        };
    }

    static async getCurveBatchLPDetails(
        minFeesBps: bigint,
        startPrice: bigint,
        endPrice: bigint,
        bestAskPrice: bigint,
        pricePrecision: bigint,
        sizePrecision: bigint,
        quoteAssetDecimals: bigint,
        baseAssetDecimals: bigint,
        tickSize: bigint,
        minSize: bigint,
        quoteLiquidity?: bigint, // In quote asset decimals
        baseLiquidity?: bigint, // In base asset decimals
    ): Promise<BatchLPDetails> {
        // don't allow both quoteLiquidity and baseLiquidity to be undefined
        if (quoteLiquidity === undefined && baseLiquidity === undefined) {
            throw new Error('quoteLiquidity and baseLiquidity cannot be undefined');
        }

        startPrice = startPrice - (startPrice % tickSize);

        var numBids: bigint = BigInt(0);
        var numAsks: bigint = BigInt(0);
        const bids: Position[] = [];
        const asks: Position[] = [];

        while (startPrice < bestAskPrice) {
            numBids++;
            var nextPrice = (startPrice * (FEE_DENOMINATOR + minFeesBps)) / FEE_DENOMINATOR;
            if (nextPrice == startPrice) {
                nextPrice = startPrice + tickSize;
            }
            nextPrice = nextPrice - (nextPrice % tickSize);

            const position = {
                price: startPrice,
                liquidity: BigInt(0),
                flipPrice: nextPrice,
            };
            bids.push(position);

            startPrice = nextPrice;
        }

        while (startPrice < endPrice) {
            numAsks++;
            var nextPrice = (startPrice * (FEE_DENOMINATOR + minFeesBps)) / FEE_DENOMINATOR;
            if (nextPrice == startPrice) {
                nextPrice = startPrice + tickSize;
            }
            nextPrice = nextPrice - (nextPrice % tickSize);

            const position = {
                price: nextPrice,
                liquidity: BigInt(0),
                flipPrice: startPrice,
            };
            asks.push(position);

            startPrice = nextPrice;
        }

        var quoteInFarthestBid: bigint = BigInt(0);
        var quoteInFarthestAsk: bigint = BigInt(0);

        if (quoteLiquidity !== undefined && baseLiquidity === undefined) {
            baseLiquidity = BigInt(0);

            quoteInFarthestBid = (BigInt(2) * quoteLiquidity) / (numBids ** BigInt(2) + numBids);
            quoteInFarthestAsk = (BigInt(2) * quoteLiquidity) / (numAsks ** BigInt(2) + numAsks + BigInt(1));

            for (const ask of asks) {
                const askIndex = asks.indexOf(ask);

                baseLiquidity +=
                    (quoteInFarthestAsk *
                        (numAsks - BigInt(askIndex)) *
                        BigInt(10) ** baseAssetDecimals *
                        pricePrecision) /
                    (BigInt(10) ** quoteAssetDecimals * ask.price);
            }

            return {
                bids: bids.sort((a, b) => Number(b.price - a.price)),
                asks: asks.sort((a, b) => Number(b.price - a.price)),
                quoteLiquidity: quoteLiquidity ?? BigInt(0),
                baseLiquidity: baseLiquidity ?? BigInt(0),
            };
        }

        if (baseLiquidity !== undefined && quoteLiquidity === undefined) {
            for (const ask of asks) {
                const askIndex = asks.indexOf(ask) + 1;
                quoteInFarthestAsk +=
                    (baseLiquidity *
                        BigInt(10) ** quoteAssetDecimals *
                        pricePrecision *
                        (numAsks - BigInt(askIndex) + BigInt(1))) /
                    (ask.price * BigInt(10) ** baseAssetDecimals);
            }

            quoteInFarthestBid = (quoteInFarthestAsk * (numAsks + BigInt(1))) / numBids;

            quoteLiquidity = (numBids * (numBids + BigInt(1)) * quoteInFarthestBid) / BigInt(2);

            return {
                bids: bids.sort((a, b) => Number(b.price - a.price)),
                asks: asks.sort((a, b) => Number(b.price - a.price)),
                quoteLiquidity: quoteLiquidity ?? BigInt(0),
                baseLiquidity: baseLiquidity ?? BigInt(0),
            };
        }

        for (const bid of bids) {
            const bidIndex = bids.indexOf(bid) + 1;
            bid.liquidity =
                (quoteInFarthestBid * BigInt(bidIndex) * pricePrecision * sizePrecision) /
                (BigInt(10) ** quoteAssetDecimals * bid.price);
            if (bid.liquidity < minSize) {
                throw new Error('bid liquidity is less than minSize');
            }
        }

        for (const ask of asks) {
            const askIndex = asks.indexOf(ask);
            ask.liquidity =
                (quoteInFarthestAsk * (numAsks - BigInt(askIndex)) * pricePrecision * sizePrecision) /
                (BigInt(10) ** quoteAssetDecimals * ask.price);
            if (ask.liquidity < minSize) {
                throw new Error('ask liquidity is less than minSize');
            }
        }

        return {
            bids: bids.sort((a, b) => Number(b.price - a.price)),
            asks: asks.sort((a, b) => Number(b.price - a.price)),
            quoteLiquidity: quoteLiquidity ?? BigInt(0),
            baseLiquidity: baseLiquidity ?? BigInt(0),
        };
    }

    static async getBidAskBatchLPDetails(
        minFeesBps: bigint,
        startPrice: bigint,
        endPrice: bigint,
        bestAskPrice: bigint,
        pricePrecision: bigint,
        sizePrecision: bigint,
        quoteAssetDecimals: bigint,
        baseAssetDecimals: bigint,
        tickSize: bigint,
        minSize: bigint,
        quoteLiquidity?: bigint, // In quote asset decimals
        baseLiquidity?: bigint, // In base asset decimals
    ): Promise<BatchLPDetails> {
        // don't allow both quoteLiquidity and baseLiquidity to be undefined
        if (quoteLiquidity === undefined && baseLiquidity === undefined) {
            throw new Error('quoteLiquidity and baseLiquidity cannot be undefined');
        }

        startPrice = startPrice - (startPrice % tickSize);

        var numBids: bigint = BigInt(0);
        var numAsks: bigint = BigInt(0);
        const bids: Position[] = [];
        const asks: Position[] = [];

        while (startPrice < bestAskPrice) {
            numBids++;
            var nextPrice = (startPrice * (FEE_DENOMINATOR + minFeesBps)) / FEE_DENOMINATOR;
            if (nextPrice == startPrice) {
                nextPrice = startPrice + tickSize;
            }
            nextPrice = nextPrice - (nextPrice % tickSize);

            const position = {
                price: startPrice,
                liquidity: BigInt(0),
                flipPrice: nextPrice,
            };
            bids.push(position);

            startPrice = nextPrice;
        }

        while (startPrice < endPrice) {
            numAsks++;
            var nextPrice = (startPrice * (FEE_DENOMINATOR + minFeesBps)) / FEE_DENOMINATOR;
            if (nextPrice == startPrice) {
                nextPrice = startPrice + tickSize;
            }
            nextPrice = nextPrice - (nextPrice % tickSize);

            const position = {
                price: nextPrice,
                liquidity: BigInt(0),
                flipPrice: startPrice,
            };
            asks.push(position);

            startPrice = nextPrice;
        }

        var quoteInClosestBid: bigint = BigInt(0);
        var quoteInClosestAsk: bigint = BigInt(0);

        if (quoteLiquidity !== undefined && baseLiquidity === undefined) {
            baseLiquidity = BigInt(0);

            quoteInClosestBid = (BigInt(2) * quoteLiquidity) / (numBids ** BigInt(2) + numBids);
            quoteInClosestAsk = (BigInt(2) * quoteLiquidity) / (numAsks ** BigInt(2) + numAsks + BigInt(1));

            for (const ask of asks) {
                const askIndex = asks.indexOf(ask) + 1;

                baseLiquidity +=
                    (quoteInClosestAsk * BigInt(askIndex) * BigInt(10) ** baseAssetDecimals * pricePrecision) /
                    (BigInt(10) ** quoteAssetDecimals * ask.price);
            }

            return {
                bids: bids.sort((a, b) => Number(b.price - a.price)),
                asks: asks.sort((a, b) => Number(b.price - a.price)),
                quoteLiquidity: quoteLiquidity ?? BigInt(0),
                baseLiquidity: baseLiquidity ?? BigInt(0),
            };
        }

        if (baseLiquidity !== undefined && quoteLiquidity === undefined) {
            for (const ask of asks) {
                const askIndex = asks.indexOf(ask) + 1;
                quoteInClosestAsk +=
                    (baseLiquidity * BigInt(10) ** quoteAssetDecimals * pricePrecision * BigInt(askIndex)) /
                    (ask.price * BigInt(10) ** baseAssetDecimals);
            }

            quoteInClosestBid = quoteInClosestAsk;

            quoteLiquidity = (numBids * (numBids + BigInt(1)) * quoteInClosestBid) / BigInt(2);

            return {
                bids: bids.sort((a, b) => Number(b.price - a.price)),
                asks: asks.sort((a, b) => Number(b.price - a.price)),
                quoteLiquidity: quoteLiquidity ?? BigInt(0),
                baseLiquidity: baseLiquidity ?? BigInt(0),
            };
        }

        for (const bid of bids) {
            const bidIndex = bids.indexOf(bid);
            bid.liquidity =
                (quoteInClosestBid * (numBids - BigInt(bidIndex)) * pricePrecision * sizePrecision) /
                (BigInt(10) ** quoteAssetDecimals * bid.price);
            if (bid.liquidity < minSize) {
                throw new Error('bid liquidity is less than minSize');
            }
        }

        for (const ask of asks) {
            const askIndex = asks.indexOf(ask) + 1;
            ask.liquidity =
                (quoteInClosestAsk * BigInt(askIndex) * pricePrecision * sizePrecision) /
                (BigInt(10) ** quoteAssetDecimals * ask.price);
            if (ask.liquidity < minSize) {
                throw new Error('ask liquidity is less than minSize');
            }
        }

        return {
            bids: bids.sort((a, b) => Number(b.price - a.price)),
            asks: asks.sort((a, b) => Number(b.price - a.price)),
            quoteLiquidity: quoteLiquidity ?? BigInt(0),
            baseLiquidity: baseLiquidity ?? BigInt(0),
        };
    }
}
