import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as KuruSdk from "../../src";
import * as KuruConfig from "./../config.json";
import csvParser from "csv-parser";

const { rpcUrl, contractAddress } = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

const speedUpFactor = 5;

interface HistoricData {
    block_timestamp: number;
    from_amount: number;
    direction: string;
}

async function main() {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, contractAddress);

    let txIndex = 0;
    const historicData: HistoricData[] = [];

    // Read and parse CSV file
    fs.createReadStream(path.resolve(__dirname, "jup_clean.csv"))
        .pipe(csvParser())
        .on("data", (data) => {
            historicData.push({
                block_timestamp: parseInt(data.block_timestamp),
                from_amount: parseFloat(parseFloat(data.from_amount).toFixed(2)),
                direction: data.direction,
            });
        })
        .on("end", async () => {
            console.log("CSV file successfully processed");

            const startTime = Date.now();
            // Main processing loop
            while (txIndex < historicData.length) {
                if ((Date.now() - startTime) * speedUpFactor >= historicData[txIndex].block_timestamp) {
                    try {
                        await KuruSdk.IOC.placeMarket(
                            signer,
                            contractAddress,
                            marketParams,
                            {
                                size: historicData[txIndex].from_amount,
                                approveTokens: true,
                                isBuy: historicData[txIndex].direction === 'buy',
                                fillOrKill: false,
                            }
                        );

                        txIndex += 1;
                    } catch (error) {
                        console.error(`Transaction failed for index ${txIndex}, retrying...`, error);
                        continue; // Retry the same transaction
                    }
                } else {
                    console.log("Waiting lol!!");
                }
            }
        });
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
