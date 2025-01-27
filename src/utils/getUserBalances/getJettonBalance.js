import axios from "axios";

async function getJettonBalance(walletAddress, jettonAddress, decimals) {
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
                return 0;
            }
            if (error.response.status === 429) {
                console.warn('Rate limit exceeded. Retrying in 5 seconds...');
                await new Promise((resolve) => setTimeout(resolve, 5100)); 
                return getJettonBalance(walletAddress, jettonAddress, decimals); 
            }
        }
        throw error; 
    }
}

export default getJettonBalance;