import axios from "axios";

export async function getCollectionData(collectionAddress, retries = 5, delayTime = 5000) {
    const API_URL = `https://tonapi.io/v2/nfts/collections/${collectionAddress}`;

    try {
        const response = await axios.get(API_URL);
        const { address, metadata } = response.data;

        const collectionInfo = {
            address: address,
            name: metadata?.name || "Название отсутствует",
            image: metadata?.image || null, 
        };

        return collectionInfo;
    } catch (error) {
        if (error.response) {
            if (error.response.status === 404) {
                console.error("Collection not found: 404 error.");
                throw new Error("Collection not found");
            }
            if (error.response.status === 429) {
                console.warn(`Rate limit exceeded: 429 error. Retrying in ${delayTime / 1000} seconds...`);
                
                if (retries <= 0) {
                    console.error('Rate limit exceeded. Max retries reached.');
                    throw new Error('Max retries reached due to rate limit');
                }

                await new Promise(resolve => setTimeout(resolve, delayTime));

                return getCollectionData(collectionAddress, retries - 1, delayTime * 2);
            }
        }

        console.error(`Ошибка при получении данных коллекции: ${error.message}`);
        throw new Error('Не удалось получить данные коллекции. Проверьте адрес.');
    }
}