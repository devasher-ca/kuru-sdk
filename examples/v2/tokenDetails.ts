// ============ External Imports ============
import { ethers } from 'ethers';

// ============ Internal Imports ============
import * as KuruSdk from '../../src';
import * as KuruConfig from '../config.json';

const { rpcUrl } = KuruConfig;

const args = process.argv.slice(2);
const tokens = args.slice(0, -1); // All but last argument are token addresses
const holder = args[args.length - 1]; // Last argument is the holder address

(async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    try {
        const tokenInfo = await KuruSdk.TokenDetailsReader.getTokensInfo(
            provider,
            '0x6C15057930e0d8724886C09e940c5819fBE65465', // KuruUtils address
            tokens,
            holder,
        );

        console.log('Token Details:');
        tokenInfo.forEach((token, index) => {
            console.log(`${index + 1}. ${token.name} (${token.symbol})`);
            console.log(`   Balance: ${ethers.formatUnits(token.balance, token.decimals)}`);
            console.log(`   Decimals: ${token.decimals}`);
            console.log(`   Total Supply: ${ethers.formatUnits(token.totalSupply, token.decimals)}`);
            console.log('');
        });
    } catch (error) {
        console.error('Error fetching token details:', error);
    }
})();
