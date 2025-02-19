// ============ External Imports ============
import { ethers } from "ethers";

// ============ Internal Imports ============
import * as KuruSdk from "../../src";
import * as KuruConfig from "../config.json";

const { rpcUrl, kuruUtilsAddress, userAddress } = KuruConfig;

const TOKEN_ADDRESSES = [
    "0xB849C55123948662C365b7579B6e918b7E22777C",
    "0xa39E57996D2649Ec4FdC104659b28E8d20265BEb",
    "0xA7fD1226e03B5DC3F6E1dC953c6568849F322451",
    "0x1239a9F1eFD0e7613c2bB29df78B5920FBe91063",
    "0x639a4a8273724487f3236587d15ffdC9F6f4d226",
    "0xAfb0d64f308423d16EF8833b901dbDD750554438",
    "0x4e93e823cEAc96517e4c523bD27d1535CBCA58c6",
    "0x34D1ae6076Aee4072F54e1156D2e507DD564a355",
    "0x1563F5d987cbf41026D502e022c59F2aB171907a",
    "0xB7736a4a238B5A977d4A712Cec8074d2B66938A9",
    "0xaEd8356A8aae4bEbe6B69D4AaD98bb5A3a610dc4",
    "0x32450225818780A5240a7E9e232b6df1562C2850",
    "0xE0590015A873bF326bd645c3E1266d4db41C4E6B",
    "0x83A7184F519F75462857E0831685341D4F8Ac481",
    "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714",
    "0x6C15057930e0d8724886C09e940c5819fBE65465",
    "0xa90B46348e6493268FC3680B161864899c12631E",
    "0x3318b99A7fE98A890e40641A444a26EC1B519475",
    "0x7C75b7Bc7D31819968E67210A123a81A10664405",
    "0x7E9953A11E606187be268C3A6Ba5f36635149C81"
];

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    try {
        // Estimate gas
        const iface = new ethers.utils.Interface([
            "function getTokensInfo(address[] tokens, address holder) view returns (tuple(string name, string symbol, uint256 balance, uint8 decimals)[])"
        ]);
        const data = iface.encodeFunctionData("getTokensInfo", [TOKEN_ADDRESSES, userAddress]);
        
        const gasEstimate = await provider.estimateGas({
            to: kuruUtilsAddress,
            data
        });

        // Get token details
        const tokenInfos = await KuruSdk.TokenDetailsReader.getTokensInfo(
            provider,
            kuruUtilsAddress,
            TOKEN_ADDRESSES,
            userAddress
        );

        console.log("Token Details:");
        tokenInfos.forEach((info, index) => {
            console.log(`\nToken ${index + 1}:`);
            console.log(`Address: ${TOKEN_ADDRESSES[index]}`);
            console.log(`Name: ${info.name}`);
            console.log(`Symbol: ${info.symbol}`);
            console.log(`Balance: ${info.balance}`);
            console.log(`Decimals: ${info.decimals}`);
            console.log(`Total Supply: ${info.totalSupply}`);
        });

        console.log(`\nEstimated Gas Used: ${gasEstimate.toString()}`);

    } catch (e: any) {
        console.error("Error:", e);
        process.exit(1);
    }
})();
