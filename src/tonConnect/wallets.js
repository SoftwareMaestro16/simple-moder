import { WalletsListManager, isWalletInfoRemote } from '@tonconnect/sdk';
import 'dotenv/config';

const walletsListManager = new WalletsListManager({
    cacheTTLMs: Number(process.env.WALLETS_LIST_CACHE_TTL_MS) || 3600000
});

export async function getWallets() {
    try {
        const wallets = await walletsListManager.getWallets();
        return wallets.filter(isWalletInfoRemote);
    } catch (error) {
        console.error('Error fetching wallets:', error);
        return [];
    }
}

export async function getWalletInfo(walletAppName) {
    try {
        const wallets = await getWallets();
        return wallets.find(wallet => wallet.appName.toLowerCase() === walletAppName.toLowerCase());
    } catch (error) {
        console.error(`Error fetching wallet info for ${walletAppName}:`, error);
        return undefined;
    }
}