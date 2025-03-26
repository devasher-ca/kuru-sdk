import { ethers } from "ethers";
import { constructWrapTransaction, constructUnwrapTransaction } from "../../src/utils/unwrap";

async function main() {
    // Connect to provider and wallet
    const provider = new ethers.providers.JsonRpcProvider("RPC_URL");
    const signer = new ethers.Wallet("PRIVATE_KEY", provider);

    const WETH_ADDRESS = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701"; // WMON

    const amount = ethers.utils.parseEther("1");

    try {
        // Construct and send wrap transaction
        console.log("Constructing wrap transaction...");
        const wrapTx = await constructWrapTransaction(
            signer,
            WETH_ADDRESS,
            amount
        );
        console.log("Wrap transaction constructed:", wrapTx);

        const wrapResponse = await signer.sendTransaction(wrapTx);
        console.log("Wrap transaction sent! Waiting for confirmation...");
        await wrapResponse.wait();
        console.log("Wrap transaction confirmed!", wrapResponse.hash);

        // Wait a bit before unwrapping
        console.log("\nWaiting 10 seconds before unwrapping...");
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Construct and send unwrap transaction
        console.log("Constructing unwrap transaction...");
        const unwrapTx = await constructUnwrapTransaction(
            signer,
            WETH_ADDRESS, 
            amount
        );
        console.log("Unwrap transaction constructed:", unwrapTx);

        const unwrapResponse = await signer.sendTransaction(unwrapTx);
        console.log("Unwrap transaction sent! Waiting for confirmation...");
        await unwrapResponse.wait();
        console.log("Unwrap transaction confirmed!", unwrapResponse.hash);

    } catch (error) {
        console.error("Error:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

