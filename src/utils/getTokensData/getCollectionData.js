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
        console.error(`Ошибка при получении данных коллекции: ${error.message}`);
        throw new Error('Не удалось получить данные коллекции. Проверьте адрес.');
    }
}