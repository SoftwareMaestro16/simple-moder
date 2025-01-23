import axios from "axios";

export const SIMPLE_COIN_ADDRESS = 'EQB9QBqniFI0jOmw3PU6v1v4LU3Sivm9yPXDDB9Qf7cXTDft';

export async function getSimpleCoinPrice() {
    const API_URL = `https://api.geckoterminal.com/api/v2/networks/ton/tokens/${SIMPLE_COIN_ADDRESS}`;

    try {
        const response = await axios.get(API_URL);
        const price = response.data.data.attributes.price_usd;

        return price;
    } catch (error) {
        console.error("Error fetching jetton price:", error);
        throw new Error("Failed to fetch jetton price");
    }
}