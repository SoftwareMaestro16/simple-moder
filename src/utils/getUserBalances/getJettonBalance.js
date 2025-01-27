import axios from "axios";

async function getJettonBalance(walletAddress, jettonAddress, decimals, retries = 5, delayTime = 5100) {
    const API_URL = `https://tonapi.io/v2/accounts/${walletAddress}/jettons/${jettonAddress}`;
  
    try {
        const response = await axios.get(API_URL);
  
        if (response.data && response.data.balance) {
            return response.data.balance / 10 ** decimals;
        }
  
        return 0; 
    } catch (error) {
        if (error.response) {
            if (error.response.status === 404) {
                console.error("Jetton not found: 404 error.");
                return 0;
            }
            if (error.response.status === 429) {
                console.warn(`Rate limit exceeded: 429 error. Retrying in ${delayTime / 1000} seconds...`);
                
                if (retries <= 0) {
                    console.error('Rate limit exceeded. Max retries reached.');
                    throw new Error('Max retries reached due to rate limit');
                }

                await new Promise(resolve => setTimeout(resolve, delayTime));

                return getJettonBalance(walletAddress, jettonAddress, decimals, retries - 1, delayTime * 2);
            }
        }
        console.error("Error fetching jetton balance:", error.message);
        throw error; 
    }
}

export default getJettonBalance;