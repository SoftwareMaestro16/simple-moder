import axios from "axios";

async function getJettonBalance(walletAddress, jettonAddress, decimals) {
    const API_URL = `https://tonapi.io/v2/accounts/${walletAddress}/jettons/${jettonAddress}`;
 
    try {
      const response = await axios.get(API_URL);
  
      if (response.data && response.data.balance) {
        return response.data.balance / 10 ** decimals;
      }
  
      // console.warn(`Jetton not found for wallet ${wallet}.`);
      return 0; 
    } catch (error) {
      if (error.response) {
        if (error.response.status === 404) {
          console.error('404 Not Found: Jetton or wallet does not exist.');
          return 0;
        }
        if (error.response.status === 429) {
          console.warn('Rate limit exceeded. Retrying...');
          await new Promise((resolve) => setTimeout(resolve, 5000));
          return getData(wallet);
        }
      }
      throw error; 
    }
  }
  
export default getJettonBalance;