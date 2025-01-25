import Jetton from '../models/Jetton.js';

export async function addJetton(address, name, symbol, decimals) {
    Jetton.syncIndexes()
    .then(() => console.log("Indexes synced"))
    .catch(err => console.error("Error syncing indexes:", err));
    try {
        if (!address) {
            throw new Error('Address cannot be null or undefined');
        }

        const existingJetton = await Jetton.findOne({ address });
        if (existingJetton) {
            console.log(`Jetton с Address ${address} уже существует.`);
            return existingJetton;
        }

        const newJetton = new Jetton({ address, name, symbol, decimals });
        await newJetton.save();
        console.log(`Jetton ${name} успешно добавлен.`);
        return newJetton;
    } catch (error) {
        console.error('Ошибка при добавлении Jetton:', error);
        throw error;
    }
}

export async function deleteJetton(address) {
    try {
        if (!address) {
            throw new Error('Address cannot be null or undefined');
        }

        const deletedJetton = await Jetton.findOneAndDelete({ address });
        if (deletedJetton) {
            console.log(`Jetton с Address ${address} успешно удален.`);
            return deletedJetton;
        } else {
            console.log(`Jetton с Address ${address} не найден.`);
            return null;
        }
    } catch (error) {
        console.error('Ошибка при удалении Jetton:', error);
        throw error;
    }
}

export async function getAllJettonSymbols() {
    try {
        const jettons = await Jetton.find({}, 'symbol');
        return jettons.map(jetton => jetton.symbol);
    } catch (error) {
        console.error('Ошибка при получении списка жетонов:', error);
        throw error;
    }
}

export async function getAllJettonAddressesAndSymbols() {
    try {
        const jettons = await Jetton.find({}, 'symbol address');
        return jettons.map(jetton => ({
            symbol: jetton.symbol,
            address: jetton.address
        }));
    } catch (error) {
        console.error('Ошибка при получении списка жетонов:', error);
        throw error;
    }
}

export async function getJettonDecimals(jettonAddress) {
    try {
        const jetton = await Jetton.findOne({ address: jettonAddress });
        if (!jetton) throw new Error('Jetton не найден в базе данных.');
        return jetton.decimals;
    } catch (error) {
        console.error('Ошибка при получении decimals для жетона:', error.message);
        throw new Error('Не удалось получить decimals для жетона.');
    }
}
