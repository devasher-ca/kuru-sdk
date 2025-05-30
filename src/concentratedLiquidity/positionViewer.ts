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

    /**
     * Calculates the liquidity distribution for a batch of limit orders on a curve.
     * The core principle is that the quote currency value of the positions forms an
     * arithmetic progression.
     *
     * @param minFeesBps - Minimum fees in basis points.
     * @param startPrice - The starting price for placing liquidity.
     * @param endPrice - The ending price for placing liquidity.
     * @param bestAskPrice - The current best ask price on the market.
     * @param pricePrecision - The precision factor for prices (e.g., 10^18).
     * @param sizePrecision - The precision factor for position sizes (e.g., 10^6).
     * @param quoteAssetDecimals - The number of decimals for the quote asset.
     * @param baseAssetDecimals - The number of decimals for the base asset.
     * @param tickSize - The minimum price increment.
     * @param minSize - The minimum position size allowed.
     * @param quoteLiquidity - The total liquidity to provide, denominated in the quote asset.
     * @param baseLiquidity - The total liquidity to provide, denominated in the base asset.
     * @returns A promise resolving to an object with bid and ask positions and total liquidity.
     */
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
        // Ensure that at least one form of liquidity is provided.
        if (quoteLiquidity === undefined && baseLiquidity === undefined) {
            throw new Error('Either quoteLiquidity or baseLiquidity must be provided.');
        }

        // Align the starting price with the nearest tick.
        startPrice = startPrice - (startPrice % tickSize);

        const bids: Position[] = [];
        const asks: Position[] = [];

        let currentPrice = startPrice;

        // #############################################################
        // # 1. Generate Bid Positions Grid
        // #############################################################
        // Create bid positions from the start price up to the best ask price.
        while (currentPrice < bestAskPrice) {
            let nextPrice = (currentPrice * (FEE_DENOMINATOR + minFeesBps)) / FEE_DENOMINATOR;
            if (nextPrice === currentPrice) {
                nextPrice = currentPrice + tickSize; // Ensure progress
            }
            nextPrice = nextPrice - (nextPrice % tickSize); // Align to tick

            bids.push({
                price: currentPrice,
                liquidity: BigInt(0),
                flipPrice: nextPrice,
            });
            currentPrice = nextPrice;
        }

        // #############################################################
        // # 2. Generate Ask Positions Grid
        // #############################################################
        // Create ask positions from where bids ended up to the end price.
        while (currentPrice < endPrice) {
            let nextPrice = (currentPrice * (FEE_DENOMINATOR + minFeesBps)) / FEE_DENOMINATOR;
            if (nextPrice === currentPrice) {
                nextPrice = currentPrice + tickSize; // Ensure progress
            }
            nextPrice = nextPrice - (nextPrice % tickSize); // Align to tick

            asks.push({
                price: nextPrice, // Ask price is the *next* price
                liquidity: BigInt(0),
                flipPrice: currentPrice, // The price at which it would flip to a bid
            });
            currentPrice = nextPrice;
        }

        const numBids = BigInt(bids.length);
        const numAsks = BigInt(asks.length);

        // #############################################################
        // # 3. Distribute Liquidity
        // #############################################################

        if (quoteLiquidity !== undefined) {
            // Scenario A: Total Quote Liquidity is provided.
            // This logic distributes the total quote amount arithmetically across bids and asks.

            // The sum of an arithmetic series 1 + 2 + ... + N is N*(N+1)/2.
            // We use this to find the quote amount for the farthest position (q1).
            const quoteInFarthestBid =
                numBids > 0 ? (BigInt(2) * quoteLiquidity) / (numBids * (numBids + BigInt(1))) : BigInt(0);
            const quoteInFarthestAsk =
                numAsks > 0 ? (BigInt(2) * quoteLiquidity) / (numAsks * (numAsks + BigInt(1))) : BigInt(0);

            let totalBaseLiquidity = BigInt(0);

            // Distribute liquidity across bids.
            for (let i = 0; i < bids.length; i++) {
                const bid = bids[i];
                // The quote value for bid `i` is `(i+1) * q1`.
                const quoteForThisBid = quoteInFarthestBid * BigInt(i + 1);
                // Convert quote value to base liquidity.
                // Liquidity = (QuoteValue * SizePrecision * PricePrecision) / (10^QuoteDecimals * Price)
                bid.liquidity =
                    (quoteForThisBid * pricePrecision * sizePrecision) / (BigInt(10) ** quoteAssetDecimals * bid.price);

                if (bid.liquidity < minSize) {
                    throw new Error(`Calculated bid liquidity is less than minSize.`);
                }
            }

            // Distribute liquidity across asks.
            for (let i = 0; i < asks.length; i++) {
                const ask = asks[i];
                // The quote value for ask `i` is `(i+1) * q1`.
                const quoteForThisAsk = quoteInFarthestAsk * BigInt(i + 1);
                // Convert quote value to base liquidity.
                ask.liquidity =
                    (quoteForThisAsk * sizePrecision * pricePrecision) / (BigInt(10) ** quoteAssetDecimals * ask.price);

                // Accumulate the calculated base liquidity.
                totalBaseLiquidity += ask.liquidity;

                if (ask.liquidity < minSize) {
                    throw new Error(`Calculated ask liquidity is less than minSize.`);
                }
            }

            // We need to scale totalBaseLiquidity from sizePrecision to baseAssetDecimals
            baseLiquidity = (totalBaseLiquidity * BigInt(10) ** baseAssetDecimals) / sizePrecision;
        } else if (baseLiquidity !== undefined) {
            // Scenario B: Total Base Liquidity is provided (for asks).
            // This is the corrected logic.
            if (numAsks === BigInt(0)) {
                throw new Error('Cannot provide baseLiquidity when there are no asks to place it in.');
            }

            // The invariant: quote_i = i * quote_1 => (base_i * price_i) = i * (base_1 * price_1)
            // This gives: base_i = i * base_1 * (price_1 / price_i)
            // Total Base Liquidity (B) = sum(base_i) = base_1 * sum(i * (price_1 / price_i))
            // We first calculate the weighted sum: sum(i * (price_1 / price_i))

            const farthestAskPrice = asks[0].price;
            let weightedSumOfBaseRatios = BigInt(0);

            for (let i = 0; i < asks.length; i++) {
                const ask = asks[i];
                // Calculate term `i * (price_1 / price_i)`. Multiply by pricePrecision for integer math.
                const ratio = (BigInt(i + 1) * farthestAskPrice * pricePrecision) / ask.price;
                weightedSumOfBaseRatios += ratio;
            }

            // Now, solve for base_1: base_1 = B / (weightedSum / pricePrecision)
            // base_1 (in base asset decimals) = (B * pricePrecision) / weightedSum
            const baseInFarthestAsk = (baseLiquidity * pricePrecision) / weightedSumOfBaseRatios;

            let totalQuoteLiquidity = BigInt(0);

            // Distribute liquidity across all asks based on base_1.
            for (let i = 0; i < asks.length; i++) {
                const ask = asks[i];
                // Calculate base_i = base_1 * i * (price_1 / price_i)
                const baseForThisAsk = (baseInFarthestAsk * BigInt(i + 1) * farthestAskPrice) / ask.price;

                // Convert the base amount (in baseAssetDecimals) to the 'liquidity' field (in sizePrecision).
                ask.liquidity = (baseForThisAsk * sizePrecision) / BigInt(10) ** baseAssetDecimals;

                if (ask.liquidity < minSize) {
                    throw new Error(`Calculated ask liquidity is less than minSize.`);
                }

                // Calculate the corresponding quote amount for this ask and add to the total.
                // QuoteValue = (BaseValue * Price * 10^QuoteDecimals) / (10^BaseDecimals * PricePrecision)
                const quoteForThisAsk =
                    (baseForThisAsk * ask.price * BigInt(10) ** quoteAssetDecimals) /
                    (BigInt(10) ** baseAssetDecimals * pricePrecision);
                totalQuoteLiquidity += quoteForThisAsk;
            }

            // Now that we have the total quote liquidity from the asks, we can distribute it across the bids.
            if (numBids > 0) {
                const quoteInFarthestBid = (BigInt(2) * totalQuoteLiquidity) / (numBids * (numBids + BigInt(1)));
                for (let i = 0; i < bids.length; i++) {
                    const bid = bids[i];
                    const quoteForThisBid = quoteInFarthestBid * BigInt(i + 1);
                    bid.liquidity =
                        (quoteForThisBid * pricePrecision * sizePrecision) /
                        (BigInt(10) ** quoteAssetDecimals * bid.price);

                    if (bid.liquidity < minSize) {
                        throw new Error(`Calculated bid liquidity is less than minSize.`);
                    }
                }
            }

            quoteLiquidity = totalQuoteLiquidity;
        }

        // #############################################################
        // # 4. Finalize and Return
        // #############################################################
        // Sort bids descending (highest price first) and asks ascending (lowest price first).
        return {
            bids: bids.sort((a, b) => Number(b.price - a.price)),
            asks: asks.sort((a, b) => Number(a.price - b.price)),
            quoteLiquidity: quoteLiquidity ?? BigInt(0),
            baseLiquidity: baseLiquidity ?? BigInt(0),
        };
    }

    /**
     * Calculates the liquidity distribution in a "Wall" or "Hump" shape.
     * This is the mirror of the "Curve" distribution. Liquidity is highest at the
     * outer edges of the price range (startPrice and endPrice) and decreases
     * linearly towards the center spread.
     *
     * @param minFeesBps - Minimum fees in basis points.
     * @param startPrice - The starting price for placing liquidity (farthest bid).
     * @param endPrice - The ending price for placing liquidity (farthest ask).
     * @param bestAskPrice - The current best ask price, which defines the center of the spread.
     * @param pricePrecision - The precision factor for prices (e.g., 10^18).
     * @param sizePrecision - The precision factor for position sizes (e.g., 10^6).
     * @param quoteAssetDecimals - The number of decimals for the quote asset.
     * @param baseAssetDecimals - The number of decimals for the base asset.
     * @param tickSize - The minimum price increment.
     * @param minSize - The minimum position size allowed.
     * @param quoteLiquidity - The total liquidity for one side (e.g., asks), denominated in the quote asset.
     * @param baseLiquidity - The total liquidity for one side (e.g., asks), denominated in the base asset.
     * @returns A promise resolving to an object with bid and ask positions and total liquidity.
     */
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
        if (quoteLiquidity === undefined && baseLiquidity === undefined) {
            throw new Error('Either quoteLiquidity or baseLiquidity must be provided.');
        }

        startPrice = startPrice - (startPrice % tickSize);

        const bids: Position[] = [];
        const asks: Position[] = [];

        let currentPrice = startPrice;

        // #############################################################
        // # 1. Generate Bid & Ask Position Grids
        // #############################################################
        // Bids are generated from farthest (startPrice) to closest.
        while (currentPrice < bestAskPrice) {
            let nextPrice = (currentPrice * (FEE_DENOMINATOR + minFeesBps)) / FEE_DENOMINATOR;
            if (nextPrice === currentPrice) nextPrice = currentPrice + tickSize;
            nextPrice = nextPrice - (nextPrice % tickSize);
            bids.push({ price: currentPrice, liquidity: BigInt(0), flipPrice: nextPrice });
            currentPrice = nextPrice;
        }

        // Asks are generated from closest to farthest (endPrice).
        while (currentPrice < endPrice) {
            let nextPrice = (currentPrice * (FEE_DENOMINATOR + minFeesBps)) / FEE_DENOMINATOR;
            if (nextPrice === currentPrice) nextPrice = currentPrice + tickSize;
            nextPrice = nextPrice - (nextPrice % tickSize);
            asks.push({ price: nextPrice, liquidity: BigInt(0), flipPrice: currentPrice });
            currentPrice = nextPrice;
        }

        const numBids = BigInt(bids.length);
        const numAsks = BigInt(asks.length);

        // #############################################################
        // # 2. Distribute Liquidity
        // #############################################################

        if (quoteLiquidity !== undefined) {
            // Scenario A: Total Quote Liquidity is provided.
            let totalBaseLiquidity = BigInt(0);

            // Calculate the value of a single "quote unit" based on the sum of the series 1...N
            const quoteUnitForBids =
                numBids > 0 ? (BigInt(2) * quoteLiquidity) / (numBids * (numBids + BigInt(1))) : BigInt(0);
            const quoteUnitForAsks =
                numAsks > 0 ? (BigInt(2) * quoteLiquidity) / (numAsks * (numAsks + BigInt(1))) : BigInt(0);

            // Distribute liquidity across bids.
            for (let i = 0; i < bids.length; i++) {
                const bid = bids[i];
                // MIRRORED LOGIC: Farthest bid (i=0) gets the most liquidity (numBids units).
                const quoteMultiplier = numBids - BigInt(i);
                const quoteForThisBid = quoteUnitForBids * quoteMultiplier;

                bid.liquidity =
                    (quoteForThisBid * pricePrecision * sizePrecision) / (BigInt(10) ** quoteAssetDecimals * bid.price);
                if (bid.liquidity < minSize) throw new Error('Calculated bid liquidity is less than minSize.');
            }

            // Distribute liquidity across asks.
            for (let i = 0; i < asks.length; i++) {
                const ask = asks[i];
                // MIRRORED LOGIC: Farthest ask (i=numAsks-1) gets the least liquidity (1 unit).
                const quoteMultiplier = numAsks - BigInt(i);
                const quoteForThisAsk = quoteUnitForAsks * quoteMultiplier;

                ask.liquidity =
                    (quoteForThisAsk * pricePrecision * sizePrecision) / (BigInt(10) ** quoteAssetDecimals * ask.price);
                if (ask.liquidity < minSize) throw new Error('Calculated ask liquidity is less than minSize.');

                totalBaseLiquidity +=
                    (quoteForThisAsk * BigInt(10) ** baseAssetDecimals * pricePrecision) /
                    (BigInt(10) ** quoteAssetDecimals * ask.price);
            }

            baseLiquidity = totalBaseLiquidity;
        } else if (baseLiquidity !== undefined) {
            // Scenario B: Total Base Liquidity is provided (for asks).
            if (numAsks === BigInt(0)) {
                throw new Error('Cannot provide baseLiquidity when there are no asks to place it in.');
            }

            // Mirrored Invariant: quote_i = (numAsks - i) * quote_unit (where i=0 is closest)
            // The unit corresponds to the farthest ask. Let's call it q_f = b_f * p_f.
            // So, base_i = (numAsks - i) * b_f * (p_f / p_i)
            // Total Base B = b_f * sum((numAsks - i) * (p_f / p_i))

            const farthestAsk = asks[asks.length - 1];
            const farthestAskPrice = farthestAsk.price;
            let weightedSumOfBaseRatios = BigInt(0);

            for (let i = 0; i < asks.length; i++) {
                const ask = asks[i];
                // Calculate term `(numAsks - i) * (p_f / p_i)`
                const ratio = ((numAsks - BigInt(i)) * farthestAskPrice * pricePrecision) / ask.price;
                weightedSumOfBaseRatios += ratio;
            }

            // Solve for b_f (base liquidity in the FARTHEST ask, which has 1 unit).
            const baseInFarthestAsk = (baseLiquidity * pricePrecision) / weightedSumOfBaseRatios;

            let totalQuoteLiquidity = BigInt(0);

            // Distribute liquidity across all asks based on b_f.
            for (let i = 0; i < asks.length; i++) {
                const ask = asks[i];
                const baseForThisAsk = ((numAsks - BigInt(i)) * baseInFarthestAsk * farthestAskPrice) / ask.price;

                ask.liquidity = (baseForThisAsk * sizePrecision) / BigInt(10) ** baseAssetDecimals;
                if (ask.liquidity < minSize) throw new Error('Calculated ask liquidity is less than minSize.');

                const quoteForThisAsk =
                    (baseForThisAsk * ask.price * BigInt(10) ** quoteAssetDecimals) /
                    (BigInt(10) ** baseAssetDecimals * pricePrecision);
                totalQuoteLiquidity += quoteForThisAsk;
            }

            // Provision bids using the mirrored logic.
            if (numBids > 0) {
                const quoteUnitForBids = (BigInt(2) * totalQuoteLiquidity) / (numBids * (numBids + BigInt(1)));
                for (let i = 0; i < bids.length; i++) {
                    const bid = bids[i];
                    // Farthest bid (i=0) gets the most liquidity.
                    const quoteMultiplier = numBids - BigInt(i);
                    const quoteForThisBid = quoteUnitForBids * quoteMultiplier;

                    bid.liquidity =
                        (quoteForThisBid * pricePrecision * sizePrecision) /
                        (BigInt(10) ** quoteAssetDecimals * bid.price);
                    if (bid.liquidity < minSize) throw new Error('Calculated bid liquidity is less than minSize.');
                }
            }

            quoteLiquidity = totalQuoteLiquidity;
        }

        // #############################################################
        // # 3. Finalize and Return
        // #############################################################
        return {
            bids: bids.sort((a, b) => Number(b.price - a.price)), // highest price first
            asks: asks.sort((a, b) => Number(a.price - b.price)), // lowest price first
            quoteLiquidity: quoteLiquidity ?? BigInt(0),
            baseLiquidity: baseLiquidity ?? BigInt(0),
        };
    }
}
