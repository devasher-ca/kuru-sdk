import { ethers } from "ethers";
import * as KuruSdk from "../../src";
import * as KuruConfig from "../config.json";
import erc20Abi from "../../abi/IERC20.json";
const {
    rpcUrl,
    vaultAddress,
    // contractAddress,
    baseTokenAddress,
    quoteTokenAddress,
    marginAccountAddress,
} = KuruConfig;

const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
    throw new Error("process.env.PRIVATE_KEY is not set");
}

const marketAddress = "0x473d60358019406a3fdb222c3d20658145614175";

(async () => {
    console.log("Starting vault deposit");

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log("Getting provider and signer");

    // const baseAmount = ethers.utils.parseEther("0.01");
    const quoteAmount = ethers.utils.parseEther("0.01");

    console.log("Vault liquidity");

    const { token1, token2 } = await KuruSdk.Vault.getVaultLiquidity(
        vaultAddress,
        baseTokenAddress,
        quoteTokenAddress,
        marginAccountAddress,
        provider
    );

    console.log("Vault liquidity in terms of token1 and token2", {
        token1: token1.balance.toString(),
        token2: token2.balance.toString(),
    });

    const marketParams = await KuruSdk.ParamFetcher.getMarketParams(provider, marketAddress);

    const calculatedAmount1 = await KuruSdk.Vault.calculateAmount1ForAmount2(
        quoteAmount,
        marketAddress,
        marketParams,
        provider
    );

    console.log("Calculated quote amount", calculatedAmount1.toString());

    const token1Balance = await (token1.address === ethers.constants.AddressZero
        ? await signer.getBalance()
        : new ethers.Contract(token1.address, erc20Abi.abi, signer).balanceOf(await signer.getAddress()));

    const token2Balance = await (token2.address === ethers.constants.AddressZero
        ? await signer.getBalance()
        : new ethers.Contract(token2.address, erc20Abi.abi, signer).balanceOf(await signer.getAddress()));

    console.log(`
        Token1: ${token1.address},
        Vault balance: ${ethers.utils.formatUnits(token1.balance.toString(), marketParams.baseAssetDecimals)},
        User balance: ${ethers.utils.formatUnits(token1Balance.toString(), marketParams.baseAssetDecimals)},

        Token2: ${token2.address},
        Vault balance: ${ethers.utils.formatUnits(token2.balance.toString(), marketParams.quoteAssetDecimals)},
        User balance: ${ethers.utils.formatUnits(token2Balance.toString(), marketParams.quoteAssetDecimals)},

        Calculated amount1: ${ethers.utils.formatUnits(calculatedAmount1.toString(), marketParams.baseAssetDecimals)},
        Quote amount: ${ethers.utils.formatUnits(quoteAmount.toString(), marketParams.quoteAssetDecimals)}
        `);

    const constructedDepositTx = await KuruSdk.Vault.constructDepositTransaction(
        calculatedAmount1,
        quoteAmount,
        baseTokenAddress,
        quoteTokenAddress,
        vaultAddress,
        signer
    );

    console.log("Deposited transaction constructed", constructedDepositTx);

    const depositedTx = await signer.sendTransaction(constructedDepositTx);

    console.log("Deposit successful. Transaction hash:", depositedTx.hash);

    // withdraw 50% of the shares

    const vault = new ethers.Contract(
        vaultAddress,
        ["function balanceOf(address account) public view returns (uint256)"],
        signer
    );
    const vaultBalance = await vault.balanceOf(await signer.getAddress());
    console.log("Vault balance (shares):", vaultBalance.toString());

    // Withdraw half of the shares
    const halfShares = vaultBalance.div(2);
    const constructedWithdrawTx = await KuruSdk.Vault.constructWithdrawTransaction(halfShares, vaultAddress, signer);
    console.log("Withdrawal transaction constructed", constructedWithdrawTx);

    const withdrawnTx = await signer.sendTransaction(constructedWithdrawTx);
    console.log("Withdrawal successful. Transaction hash:", withdrawnTx.hash);
})().catch(console.error);
