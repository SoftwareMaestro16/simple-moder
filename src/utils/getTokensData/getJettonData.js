import axios from "axios";

export async function getJettonData(jettonAddress, retries = 5, delayTime = 5000) {
    const API_URL = `https://tonapi.io/v2/jettons/${jettonAddress}`;

    try {
        const response = await axios.get(API_URL);
        const { address, name, symbol, decimals, image } = response.data.metadata;

        return {
            address,
            name,
            symbol,
            decimals,
            image,
        };
    } catch (error) {
        if (error.response) {
            if (error.response.status === 404) {
                console.error("Jetton not found: 404 error.");
                throw new Error("Jetton not found");
            }
            if (error.response.status === 429) {
                console.warn(`Rate limit exceeded: 429 error. Retrying in ${delayTime / 1000} seconds...`);

                if (retries <= 0) {
                    throw new Error('Rate limit exceeded. Max retries reached.');
                }

                await new Promise(resolve => setTimeout(resolve, delayTime));

                return getJettonData(jettonAddress, retries - 1, delayTime * 2);
            }
        }

        console.error("Error fetching jetton data:", error.message);
        throw new Error("Failed to fetch jetton data");
    }
}