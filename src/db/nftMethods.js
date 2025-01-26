import NFT from '../models/NFT.js';

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
            return existingNFT;
        }

        const newNFT = new NFT({ address, name });
        await newNFT.save();
        return newNFT;
    } catch (error) {
        console.error('Ошибка при добавлении Collection:', error);
        throw error;
    }
};

export async function deleteNFT(address) {
    try {
        if (!address) {
            throw new Error('Address cannot be null or undefined');
        }

        const deletedNFT = await NFT.findOneAndDelete({ address });
        if (deletedNFT) {
            return deletedNFT;
        } else {
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

export async function getAllCollectionsWithAddresses() {
    try {
        const collections = await NFT.find({}, 'name address'); 
        return collections.map(collection => ({
            name: collection.name,
            address: collection.address
        }));
    } catch (error) {
        console.error('Ошибка при получении списка коллекций:', error);
        throw error;
    }
}