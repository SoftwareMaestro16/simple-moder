import axios from "axios";

async function getNftBalance(walletAddress, collectionAddress) {
    const API_URL = `https://tonapi.io/v2/accounts/${walletAddress}/nfts?collection=${collectionAddress}&limit=1000&offset=0&indirect_ownership=false`;

    try {
        const response = await axios.get(API_URL);
        return response.data.nft_items || [];
    } catch (error) {
        if (error.response) {
            const { status } = error.response;
            switch (status) {
                case 400:
                    console.error("Bad Request (400): Please check the API request parameters.");
                    break;
                case 404:
                    console.error("Not Found (404): The requested resource could not be found.");
                    break;
                case 429:
                    console.error("Too Many Requests (429): Rate limit exceeded. Please try again later.");
                    break;
                default:
                    console.error(`Unexpected error (${status}):`, error.response.data);
            }
        } else if (error.request) {
            console.error("No response received from the server:", error.request);
        } else {
            console.error("Error creating the request:", error.message);
        }
        return [];
    }
}

export default getNftBalance;