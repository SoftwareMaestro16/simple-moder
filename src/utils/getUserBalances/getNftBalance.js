import axios from "axios";
import { delay } from "../delay.js";

export async function getNftBalance(walletAddress, collectionAddress, delayTime = 5100) {
    const API_URL = `https://tonapi.io/v2/accounts/${walletAddress}/nfts?collection=${collectionAddress}&limit=1000&offset=0&indirect_ownership=false`;

    try {
        const response = await axios.get(API_URL);

        if (response.data && response.data.nft_items) {
            return response.data.nft_items;
        }

        return [];
    } catch (error) {
        if (error.response) {
            if (error.response.status === 429) {
                console.warn(`Rate limit exceeded: 429 error. Retrying in ${delayTime / 1000} seconds...`);

                await delay(delayTime);
                console.log('Rate limit exceeded, stopping further attempts.');
                return [];  
            }

            if (error.response.status === 404) {
                console.log('NFT collection or wallet not found (404). Returning 0.');
                return 0;
            }
        }

        console.error("Error fetching NFT balance:", error.message);
        throw error;
    }
}