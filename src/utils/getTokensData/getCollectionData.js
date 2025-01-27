import axios from "axios";

export async function getCollectionData(collectionAddress) {
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
                console.warn("Rate limit exceeded: 429 error. Retrying...");
                await new Promise(resolve => setTimeout(resolve, 5000)); 
                return getCollectionData(collectionAddress);  
            }
        }
        console.error(`Ошибка при получении данных коллекции: ${error.message}`);
        throw new Error('Не удалось получить данные коллекции. Проверьте адрес.');
    }
}