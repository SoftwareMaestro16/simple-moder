import axios from "axios";

export async function getJettonData(jettonAddress) {
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
        console.error("Error fetching jetton data:", error);
        throw new Error("Failed to fetch jetton data");
    }
}