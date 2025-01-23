import NFT from '../models/Nft.js';

export async function addNFT(address, name) {
    NFT.syncIndexes()
    .then(() => console.log("Indexes synced"))
    .catch(err => console.error("Error syncing indexes:", err));
    try {
        if (!address) {
            throw new Error('Address cannot be null or undefined');
        }

        const existingNFT = await NFT.findOne({ address });
        if (existingNFT) {
            console.log(`Collection с Address ${address} уже существует.`);
            return existingNFT;
        }

        const newNFT = new NFT({ address, name });
        await newNFT.save();
        console.log(`Collection ${name} успешно добавлен.`);
        return newNFT;
    } catch (error) {
        console.error('Ошибка при добавлении Collection:', error);
        throw error;
    }
}

export async function deleteNFT(address) {
    try {
        if (!address) {
            throw new Error('Address cannot be null or undefined');
        }

        const deletedNFT = await NFT.findOneAndDelete({ address });
        if (deletedNFT) {
            console.log(`Collection с Address ${address} успешно удален.`);
            return deletedNFT;
        } else {
            console.log(`Collection с Address ${address} не найден.`);
            return null;
        }
    } catch (error) {
        console.error('Ошибка при удалении Collection:', error);
        throw error;
    }
}

export async function getAllNamesCollection() {
    try {
        const collections = await NFT.find({}, 'name')
        return collections.map(collection => collection.name)
    } catch (error) {
        console.error('Ошибка при получении списка коллекций:', error);
        throw error;
    }
}
