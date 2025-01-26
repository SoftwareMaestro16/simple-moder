import User from '../models/User.js';

export async function addUser(userId, firstName, userName = null) {
    User.syncIndexes()
    .then(() => console.log("Indexes synced"))
    .catch(err => console.error("Error syncing indexes:", err));
    try {
        if (!userId) {
            throw new Error('User ID cannot be null or undefined');
        }

        const existingUser = await User.findOne({ userId });
        if (existingUser) {
            return existingUser;
        }

        const newUser = new User({ userId, firstName, userName });
        await newUser.save();
        return newUser;
    } catch (error) {
        console.error('Ошибка при добавлении пользователя:', error);
        throw error;
    }
}

export async function getUserById(userId) {
    try {
      const user = await User.findOne({ userId });
      return user;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
}

export async function getUserByAddress(address) {
    try {
        if (!address) {
            return null;
        }

        const user = await User.findOne({ walletAddress: address });
        return user;
    } catch (error) {
        console.error('Error fetching user by address:', error);
        return null;
    }
}

export async function updateUserAddress(userId, address, walletName) {
    try {
        if (!address) {
            console.error(`Адрес не указан для пользователя ${userId}.`);
            return null;
        }

        const existingUserWithAddress = await getUserByAddress(address);
        if (existingUserWithAddress && existingUserWithAddress.userId !== userId) {
            
            const sentMessage = await bot.sendMessage(chatId, `❌ Кошелек ${address} уже привязан к другому пользователю.`, {
                parse_mode: 'HTML'
            });

            setTimeout(() => {
                bot.deleteMessage(chatId, sentMessage.message_id).catch(err => {
                    console.error('Ошибка при удалении сообщения:', err);
                });
            }, 7000);

            return null; 
        }

        const user = await User.findOne({ userId });

        if (!user) {
            console.error(`Пользователь с ID ${userId} не найден.`);
            return null;
        }

        user.walletAddress = address;
        user.appWalletName = walletName;

        await user.save();
        return user;
    } catch (error) {
        console.error('Ошибка при обновлении пользователя:', error);
        throw error;
    }
}

export async function getAllUserIds() {
    try {
        const users = await User.find({}, { userId: 1, _id: 0 }); 
        return users.map(user => user.userId); 
    } catch (error) {
        console.error('Ошибка при получении списка пользователей:', error.message);
        return [];
    }
}

export async function getWalletAddressByUserId(userId) {
    try {
        const user = await User.findOne({ userId }); 
        if (!user || !user.walletAddress) {
            return null;
        }
        return user.walletAddress; 
    } catch (error) {
        console.error(`Ошибка при получении адреса кошелька для пользователя ${userId}:`, error.message);
        throw error;
    }
}