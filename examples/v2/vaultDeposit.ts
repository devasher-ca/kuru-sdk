import { ethers } from "ethers";
import * as KuruSdk from "../../src";
import * as KuruConfig from "../config.json";

const { rpcUrl, vaultAddress, contractAddress, baseTokenAddress, quoteTokenAddress } = KuruConfig;

const privateKey = process.env.PRIVATE_KEY as string;

(async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    const baseAmount = ethers.utils.parseEther("100");
    const quoteAmount = ethers.utils.parseEther("0.1");

    // Approve base token
    const baseToken = new ethers.Contract(
        baseTokenAddress,
        ["function approve(address spender, uint256 amount) public returns (bool)"],
        signer
    );
    await (await baseToken.approve(vaultAddress, baseAmount)).wait();
    console.log("Base token approved");

    // Approve quote token
    const quoteToken = new ethers.Contract(
        quoteTokenAddress,
        ["function approve(address spender, uint256 amount) public returns (bool)"],
        signer
    );
    await (await quoteToken.approve(vaultAddress, quoteAmount)).wait();
    console.log("Quote token approved");

    // Deposit into vault
    const depositReceipt = await KuruSdk.Vault.depositBasedOnAmount1(
        baseAmount,
        vaultAddress,
        contractAddress,
        signer,
        true
    );
    console.log("Initial deposit successful. Transaction hash:", depositReceipt.transactionHash);

    // Get vault balance (shares)
    const vault = new ethers.Contract(
        vaultAddress,
        ["function balanceOf(address account) public view returns (uint256)"],
        signer
    );
    const vaultBalance = await vault.balanceOf(await signer.getAddress());
    console.log("Vault balance (shares):", vaultBalance.toString());

    // Withdraw half of the shares
    const halfShares = vaultBalance.div(2);
    const withdrawReceipt = await KuruSdk.Vault.withdrawBasedOnShares(
        halfShares,
        vaultAddress,
        signer
    );
    console.log("Withdrawal successful. Transaction hash:", withdrawReceipt.transactionHash);

    // Deposit again using token1 function
    const token1Amount = ethers.utils.parseEther("100");
    const secondDepositReceipt = await KuruSdk.Vault.depositBasedOnAmount1(
        token1Amount,
        vaultAddress,
        contractAddress,
        signer,
        true
    );
    console.log("Second deposit successful. Transaction hash:", secondDepositReceipt.transactionHash);
})().catch(console.error);
