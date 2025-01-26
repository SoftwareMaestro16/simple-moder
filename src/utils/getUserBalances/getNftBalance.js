import axios from "axios";

async function getNftBalance(walletAddress, collectionAddress) {
    const API_URL = `https://tonapi.io/v2/accounts/${walletAddress}/nfts?collection=${collectionAddress}&limit=1000&offset=0&indirect_ownership=false`;

    return axios
        .get(API_URL)
        .then(response => response.data.nft_items || [])
        .catch(error => {
            console.error("Error fetching NFTs:", error);
            return [];
        });
}

export default getNftBalance;