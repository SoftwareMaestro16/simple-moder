import { generateMainKeyboard, generateSubscriptionKeyboard } from "./keyboard.js";
import { addUser, getAllUserIds, getUserById } from "../db/userMethods.js";
import { checkCoreSubscription } from "../utils/checkCoreSub.js";
import { admins } from "../utils/config.js";
import { toUserFriendlyAddress } from "@tonconnect/sdk";
import { addJetton, deleteJetton } from "../db/jettonMethods.js";
import { addNFT, deleteNFT } from "../db/nftMethods.js";
import { getJettonData } from "../utils/getTokensData/getJettonData.js";
import { getCollectionData } from "../utils/getTokensData/getCollectionData.js";
import { 
    setJettonListingPrice, 
    setCollectionListingPrice, 
    addAdmin, 
    removeAdmin,
    getAdmins, 
    setCoreChannel, 
    setCoreChat,
    getCoreMedia,
    setListingManager
} from "../db/adminMethods.js";
import { Address } from "@ton/core";
import { loadAdminData } from "../utils/config.js";
import { commandsList } from "../utils/commandsList.js";
import Chat from "../models/Chat.js";

function startCommand(bot) {
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const firstName = msg.from.first_name || 'Unknown';
        const userName = msg.from.username || null;

        try {
            const adminData = await loadAdminData();
            const coreMedia = adminData.coreMedia;

            let existingUser = await getUserById(userId);

            if (!existingUser) {
                await addUser(userId, firstName, userName);
                existingUser = await getUserById(userId);
            }

            const address = existingUser?.walletAddress || null;
            const isSubscribed = await checkCoreSubscription(userId);

            if (isSubscribed) {
                if (address) {
                    bot.sendMessage(chatId, '✅ Ваш кошелек подключен. Выберите действие:', {
                        reply_markup: { inline_keyboard: generateMainKeyboard(address) },
                    });
                } else {
                    bot.sendMessage(chatId, '👛 Добро пожаловать! Выберите кошелек для подключения.', {
                        reply_markup: { inline_keyboard: generateMainKeyboard(null) },
                    });
                }
            } else {
                bot.sendMessage(
                    chatId,
                    '❗️ Чтобы продолжить использовать бота, подпишитесь на наш канал и чат. После этого нажмите "Проверить подписку".',
                    {
                        reply_markup: generateSubscriptionKeyboard(coreMedia),
                    }
                );
            }
        } catch (error) {
            console.error('Ошибка в обработчике /start:', error);
            bot.sendMessage(chatId, 'Произошла ошибка при выполнении команды.');
        }
    });

    bot.on('callback_query', async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id; 
        const userId = callbackQuery.from.id;
        const callbackData = callbackQuery.data;

        if (callbackData === 'CheckSubscription') {
            try {
                const isSubscribed = await checkCoreSubscription(userId);

                if (isSubscribed) {
                    const existingUser = await getUserById(userId);
                    const address = existingUser?.walletAddress || null;

                    if (address) {
                        await bot.editMessageText(
                            '✅ Ваш кошелек подключен. Выберите действие:',
                            {
                                chat_id: chatId,
                                message_id: messageId,
                                reply_markup: {
                                    inline_keyboard: generateMainKeyboard(address),
                                },
                            }
                        );
                    } else {
                        await bot.editMessageText(
                            '👛 Добро пожаловать! Выберите кошелек для подключения.',
                            {
                                chat_id: chatId,
                                message_id: messageId,
                                reply_markup: {
                                    inline_keyboard: generateMainKeyboard(null),
                                },
                            }
                        );
                    }
                } else {
                    const sentMessage = await bot.sendMessage(
                        chatId,
                        '❗️ Вы не подписались на канал и чат. Пожалуйста, подпишитесь.'
                    );

                    setTimeout(() => {
                        bot.deleteMessage(chatId, sentMessage.message_id).catch((err) => {
                            console.error('Ошибка удаления сообщения:', err);
                        });
                    }, 7000);
                }
            } catch (error) {
                console.error('Ошибка при обработке CheckSubscription:', error);
                bot.sendMessage(chatId, 'Произошла ошибка при проверке подписки.');
            }
        }
    });
}

function addJettonCommand(bot) {
    bot.onText(/\/add_jetton/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!admins.includes(userId)) {
            return bot.sendMessage(chatId, 'У вас нет прав.');
        }

        await bot.sendMessage(chatId, 'Пожалуйста, отправьте адрес смарт контракта Жетона.\nВведите /cancel, чтобы отменить.');

        const listener = bot.on('message', async (response) => {
            if (response.text === '/cancel') {
                bot.removeListener('message', listener);
                return bot.sendMessage(chatId, '❌ Ввод отменен.');
            }

            try {
                const jettonAddress = response.text.trim();
                if (!jettonAddress) throw new Error('Пустой адрес.');

                const jettonData = await getJettonData(jettonAddress); 
                const { address, name, symbol, decimals, image } = jettonData;

                const caption = `
💠 <b>Информация о Жетоне:</b>
- <b>Address:</b> <code>${toUserFriendlyAddress(address)}</code>
- <b>Name:</b> ${name}
- <b>Symbol:</b> ${symbol}
- <b>Decimals:</b> ${decimals}
                `;

                await bot.sendPhoto(chatId, image, {
                    caption,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '✅ Да', callback_data: `yes_add_${jettonAddress}` },
                                { text: '❌ Нет', callback_data: `no_add_${jettonAddress}` }
                            ]
                        ]
                    }
                });

                bot.removeListener('message', listener);
            } catch (error) {
                console.error('Ошибка при получении данных жетона:', error);
                await bot.sendMessage(chatId, '❌ Произошла ошибка при получении данных жетона. Проверьте адрес и попробуйте снова.');
                bot.removeListener('message', listener);
            }
        });
    });

    bot.on('callback_query', async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const callbackData = callbackQuery.data;

        if (callbackData.startsWith('yes_add_')) {
            const jettonAddress = callbackData.split('yes_add_')[1];

            try {
                const jettonData = await getJettonData(jettonAddress); 
                const { address, name, symbol, decimals } = jettonData;

                await addJetton((Address.parse(address)).toRawString(), name, symbol, decimals);

                await bot.deleteMessage(chatId, messageId);
                await bot.sendMessage(chatId, `✅ Жетон ${name} успешно добавлен!`, {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '« Назад', callback_data: 'Menu' }
                            ]
                        ]
                    }
                });
            } catch (error) {
                console.error('Ошибка при добавлении жетона:', error);
                await bot.sendMessage(chatId, '❌ Произошла ошибка при добавлении жетона.', {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '« Назад', callback_data: 'Menu' }
                            ]
                        ]
                    }
                });
            }
        } else if (callbackData.startsWith('no_add_')) {
            await bot.deleteMessage(chatId, messageId);
            await bot.sendMessage(chatId, `❌ Жетон не был добавлен!`, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '« Назад', callback_data: 'Menu' }
                        ]
                    ]
                }
            });
        }
    });
}

function addNFTCommand(bot) {
    bot.onText(/\/add_nft/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!admins.includes(userId)) {
            return bot.sendMessage(chatId, 'У вас нет прав.');
        }

        await bot.sendMessage(chatId, 'Пожалуйста, отправьте адрес смарт контракта коллекции.\nВведите /cancel, чтобы отменить.');

        const listener = bot.on('message', async (response) => {
            if (response.text === '/cancel') {
                bot.removeListener('message', listener);
                return bot.sendMessage(chatId, '❌ Ввод отменен.');
            }

            try {
                const collectionAddress = response.text.trim();
                if (!collectionAddress) throw new Error('Пустой адрес.');

                const collectionData = await getCollectionData(collectionAddress);
                const { address, name, image } = collectionData;

                const caption = `
💠 <b>Информация о Коллекции:</b>
- <b>Адрес:</b> <code>${toUserFriendlyAddress(address)}</code>
- <b>Имя:</b> ${name}
                `;

                await bot.sendPhoto(chatId, image, {
                    caption,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '✅ Да', callback_data: `confirm_add_${toUserFriendlyAddress(address)}` },
                                { text: '❌ Нет', callback_data: `cancel_add_${toUserFriendlyAddress(address)}` }
                            ]
                        ]
                    }
                });

                bot.removeListener('message', listener);
            } catch (error) {
                console.error('Ошибка при получении данных коллекции:', error);
                await bot.sendMessage(chatId, '❌ Произошла ошибка при получении данных коллекции. Проверьте адрес и попробуйте снова.');
                bot.removeListener('message', listener);
            }
        });
    });

    bot.on('callback_query', async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const callbackData = callbackQuery.data;
    
        if (callbackData.startsWith('confirm_add_')) {
            const collectionAddress = callbackData.split('confirm_add_')[1]; 
    
            try {
                const collectionData = await getCollectionData(collectionAddress);
                const { address, name } = collectionData;
    
                await addNFT((Address.parse(address)).toRawString(), name);
    
                await bot.deleteMessage(chatId, messageId);
                await bot.sendMessage(chatId, `✅ Коллекция ${name} успешно добавлена!`, {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '« Назад', callback_data: 'Menu' }
                            ]
                        ]
                    }
                });
            } catch (error) {
                console.error('Ошибка при добавлении коллекции:', error);
                await bot.sendMessage(chatId, '❌ Произошла ошибка при добавлении коллекции.', {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '« Назад', callback_data: 'Menu' }
                            ]
                        ]
                    }
                });
            }
        } else if (callbackData.startsWith('cancel_add_')) {
            await bot.deleteMessage(chatId, messageId);
            await bot.sendMessage(chatId, `❌ Коллекция не была добавлена!`, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '« Назад', callback_data: 'Menu' }
                        ]
                    ]
                }
            });
        }
    });
}

function deleteJettonCommand(bot) {
    bot.onText(/\/delete_jetton/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!admins.includes(userId)) {
            return bot.sendMessage(chatId, 'У вас нет прав.');
        }

        await bot.sendMessage(chatId, 'Пожалуйста, отправьте адрес смарт контракта Жетона для удаления.\nВведите /cancel, чтобы отменить.');

        const listener = bot.on('message', async (response) => {
            if (response.text === '/cancel') {
                bot.removeListener('message', listener);
                return bot.sendMessage(chatId, '❌ Ввод отменен.');
            }

            try {
                const jettonAddress = response.text.trim();
                if (!jettonAddress) throw new Error('Пустой адрес.');

                const rawAddress = Address.parse(jettonAddress).toRawString();
                const deletedJetton = await deleteJetton(rawAddress);

                if (deletedJetton) {
                    const userFriendlyAddress = toUserFriendlyAddress(rawAddress);
                    await bot.sendMessage(chatId, `✅ Жетон с адресом <code>${userFriendlyAddress}</code> успешно удалён!`, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '« Назад', callback_data: 'Menu' }
                                ]
                            ]
                        }
                    });
                } else {
                    await bot.sendMessage(chatId, `❌ Жетон с адресом ${jettonAddress} не найден.`, {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '« Назад', callback_data: 'Menu' }
                                ]
                            ]
                        }
                    });
                }

                bot.removeListener('message', listener);
            } catch (error) {
                console.error('Ошибка при удалении жетона:', error);
                await bot.sendMessage(chatId, '❌ Произошла ошибка при удалении жетона. Проверьте адрес и попробуйте снова.', {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '« Назад', callback_data: 'Menu' }
                            ]
                        ]
                    }
                });
                bot.removeListener('message', listener);
            }
        });
    });
}

function deleteNFTCommand(bot) {
    bot.onText(/\/delete_nft/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!admins.includes(userId)) {
            return bot.sendMessage(chatId, 'У вас нет прав.');
        }

        await bot.sendMessage(chatId, 'Пожалуйста, отправьте адрес смарт контракта коллекции для удаления.\nВведите /cancel, чтобы отменить.');

        const listener = bot.on('message', async (response) => {
            if (response.text === '/cancel') {
                bot.removeListener('message', listener);
                return bot.sendMessage(chatId, '❌ Ввод отменен.');
            }

            try {
                const collectionAddress = response.text.trim();
                if (!collectionAddress) throw new Error('Пустой адрес.');

                const rawAddress = Address.parse(collectionAddress).toRawString();
                const deletedNFT = await deleteNFT(rawAddress);

                if (deletedNFT) {
                    const userFriendlyAddress = toUserFriendlyAddress(rawAddress);
                    await bot.sendMessage(chatId, `✅ Коллекция с адресом <code>${userFriendlyAddress}</code> успешно удалена!`, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '« Назад', callback_data: 'Menu' }
                                ]
                            ]
                        }
                    });
                } else {
                    await bot.sendMessage(chatId, `❌ Коллекция с адресом ${collectionAddress} не найдена.`, {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '« Назад', callback_data: 'Menu' }
                                ]
                            ]
                        }
                    });
                }

                bot.removeListener('message', listener);
            } catch (error) {
                console.error('Ошибка при удалении коллекции:', error);
                await bot.sendMessage(chatId, '❌ Произошла ошибка при удалении коллекции. Проверьте адрес и попробуйте снова.', {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '« Назад', callback_data: 'Menu' }
                            ]
                        ]
                    }
                });
                bot.removeListener('message', listener);
            }
        });
    });
}

function setJettonListingPriceCommand(bot) {
    bot.onText(/\/set_jetton_listing_price/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!admins.includes(userId)) {
            return bot.sendMessage(chatId, 'У вас нет прав.');
        }

        await bot.sendMessage(chatId, 'Пожалуйста, введите новую цену Листинга Жетона в 💲.\nВведите /cancel, чтобы отменить.');

        const listener = bot.on('message', async (response) => {
            if (response.text === '/cancel') {
                bot.removeListener('message', listener);
                return bot.sendMessage(chatId, '❌ Ввод отменен.');
            }

            try {
                const newListingPrice = response.text.trim();
                if (!newListingPrice || isNaN(Number(newListingPrice))) throw new Error('Некорректное значение цены.');

                const setNewPrice = await setJettonListingPrice(newListingPrice);

                if (setNewPrice) {
                    await bot.sendMessage(chatId, `✅ Цена ${newListingPrice}💲 за листинг Жетона успешно обновлена!`, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '« Назад', callback_data: 'Menu' }
                                ]
                            ]
                        }
                    });
                } 
                bot.removeListener('message', listener);
            } catch (error) {
                console.error('Ошибка при установлении цены:', error);
                await bot.sendMessage(chatId, '❌ Произошла ошибка при установлени цены.', {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '« Назад', callback_data: 'Menu' }
                            ]
                        ]
                    }
                });
                bot.removeListener('message', listener);
            }
        });
    });
};

function setNFTListingPriceCommand(bot) {
    bot.onText(/\/set_nft_listing_price/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!admins.includes(userId)) {
            return bot.sendMessage(chatId, 'У вас нет прав.');
        }

        await bot.sendMessage(chatId, 'Пожалуйста, введите новую цену Листинга Коллекции в 💲.\nВведите /cancel, чтобы отменить.');

        const listener = bot.on('message', async (response) => {
            if (response.text === '/cancel') {
                bot.removeListener('message', listener);
                return bot.sendMessage(chatId, '❌ Ввод отменен.');
            }

            try {
                const newListingPrice = response.text.trim();
                if (!newListingPrice || isNaN(Number(newListingPrice))) throw new Error('Некорректное значение цены.');

                const setNewPrice = await setCollectionListingPrice(newListingPrice);

                if (setNewPrice) {
                    await bot.sendMessage(chatId, `✅ Цена ${newListingPrice}💲 за листинг Коллекции успешно обновлена!`, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '« Назад', callback_data: 'Menu' }
                                ]
                            ]
                        }
                    });
                } 
                bot.removeListener('message', listener);
            } catch (error) {
                console.error('Ошибка при установлении цены:', error);
                await bot.sendMessage(chatId, '❌ Произошла ошибка при установлени цены.', {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '« Назад', callback_data: 'Menu' }
                            ]
                        ]
                    }
                });
                bot.removeListener('message', listener);
            }
        });
    });
};

function addNewAdminCommand(bot) {
    bot.onText(/\/add_admin/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!admins.includes(userId)) {
            return bot.sendMessage(chatId, 'У вас нет прав.');
        }

        await bot.sendMessage(chatId, 'Пожалуйста, введите ID нового админа.\nВведите /cancel, чтобы отменить.');

        const listener = bot.on('message', async (response) => {
            if (response.text === '/cancel') {
                bot.removeListener('message', listener);
                return bot.sendMessage(chatId, '❌ Ввод отменен.');
            }

            try {
                const newAdminId = response.text.trim();
                if (!newAdminId || isNaN(Number(newAdminId))) throw new Error('Некорректное значение айди.');

                const setNewAdmin = await addAdmin(newAdminId);

                if (setNewAdmin) {
                    await bot.sendMessage(chatId, `✅ Добавлен новый Админ ID ${newAdminId}.`, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '« Назад', callback_data: 'Menu' }
                                ]
                            ]
                        }
                    });
                } 
                bot.removeListener('message', listener);
            } catch (error) {
                console.error('Ошибка при установлении цены:', error);
                await bot.sendMessage(chatId, '❌ Произошла ошибка при установлени цены.', {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '« Назад', callback_data: 'Menu' }
                            ]
                        ]
                    }
                });
                bot.removeListener('message', listener);
            }
        });
    });
};

function removeAdminCommand(bot) {
    bot.onText(/\/remove_admin/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!admins.includes(userId)) {
            return bot.sendMessage(chatId, 'У вас нет прав.');
        }

        await bot.sendMessage(chatId, 'Пожалуйста, введите ID администратора для удаления.\nВведите /cancel, чтобы отменить.');

        const listener = bot.on('message', async (response) => {
            if (response.text === '/cancel') {
                bot.removeListener('message', listener);
                return bot.sendMessage(chatId, '❌ Ввод отменен.');
            }

            try {
                const adminIdToRemove = response.text.trim();
                if (!adminIdToRemove || isNaN(Number(adminIdToRemove))) throw new Error('Некорректное значение айди.');

                const removedAdmin = await removeAdmin(adminIdToRemove);

                if (removedAdmin) {
                    await bot.sendMessage(chatId, `✅ Админ ID ${adminIdToRemove} успешно удален.`, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '« Назад', callback_data: 'Menu' }
                                ]
                            ]
                        }
                    });
                } else {
                    await bot.sendMessage(chatId, `❌ Администратор с ID ${adminIdToRemove} не найден.`, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '« Назад', callback_data: 'Menu' }
                                ]
                            ]
                        }
                    });
                }
                bot.removeListener('message', listener);
            } catch (error) {
                console.error('Ошибка при удалении администратора:', error);
                await bot.sendMessage(chatId, '❌ Произошла ошибка при удалении администратора.', {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '« Назад', callback_data: 'Menu' }
                            ]
                        ]
                    }
                });
                bot.removeListener('message', listener);
            }
        });
    });
}

function getAdminsCommand(bot) {
    bot.onText(/\/get_admins/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!admins.includes(userId)) {
            return bot.sendMessage(chatId, 'У вас нет прав для выполнения этой команды.');
        }

        try {
            const adminIds = await getAdmins();

            if (adminIds.length === 0) {
                return bot.sendMessage(chatId, '❌ Список администраторов пуст.');
            }

            let resultMessage = `<b>Список администраторов:</b>\n\n`;

            for (const adminId of adminIds) {
                try {
                    const chat = await bot.getChat(adminId);
                    const entityType = {
                        private: 'пользователь',
                        group: 'группа',
                        supergroup: 'супергруппа',
                        channel: 'канал'
                    }[chat.type] || 'неизвестная сущность';

                    const name = chat.first_name
                        ? `${chat.first_name}${chat.last_name ? ` ${chat.last_name}` : ''}`
                        : chat.title;
                    const username = chat.username ? `@${chat.username}` : '(без юзернейма)';

                    resultMessage += `ID: <code>${adminId}</code>\n`;
                    resultMessage += `Имя: ${name}\n`;
                    resultMessage += `Юзернейм: ${username}\n`;
                    resultMessage += `Сущность: (${entityType})\n\n`;
                } catch (error) {
                    console.error(`Ошибка при получении информации о чате с ID ${adminId}:`, error);

                    const entityType = adminId.toString().startsWith('-100')
                        ? 'канал или группа'
                        : 'пользователь';

                    resultMessage += `ID: <code>${adminId}</code> - не найден (${entityType})\n\n`;
                }
            }

            bot.sendMessage(chatId, resultMessage, { parse_mode: 'HTML' });
        } catch (error) {
            console.error('Ошибка при выполнении команды /get_admins:', error);
            bot.sendMessage(chatId, '❌ Произошла ошибка при получении списка администраторов.');
        }
    });
}

function getCoreMediaCommand(bot) {
    bot.onText(/\/get_core_media/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!admins.includes(userId)) {
            return bot.sendMessage(chatId, 'У вас нет прав для выполнения этой команды.');
        }

        try {
            const { coreChannel, coreChat } = await getCoreMedia();

            if (!coreChannel || !coreChat) {
                return bot.sendMessage(chatId, '❌ Список медиа для подписки не настроен.');
            }

            let resultMessage = `<b>Список Медиа для Подписки:</b>\n\n`;

            resultMessage += `<b>Канал:</b>\n`;
            resultMessage += `ID: <code>${coreChannel.id}</code>\n`;
            resultMessage += `Ссылка: <a href="${coreChannel.link}">${coreChannel.link}</a>\n\n`;

            resultMessage += `<b>Чат:</b>\n`;
            resultMessage += `ID: <code>${coreChat.id}</code>\n`;
            resultMessage += `Ссылка: <a href="${coreChat.link}">${coreChat.link}</a>\n`;

            bot.sendMessage(chatId, resultMessage, { parse_mode: 'HTML' });
        } catch (error) {
            console.error('Ошибка при выполнении команды /get_core_media:', error);
            bot.sendMessage(chatId, '❌ Произошла ошибка при получении списка медиа.');
        }
    });
}

function setCoreChannelCommand(bot) {
    bot.onText(/\/set_core_channel/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!admins.includes(userId)) {
            return bot.sendMessage(chatId, 'У вас нет прав для выполнения этой команды.');
        }

        await bot.sendMessage(chatId, 'Пожалуйста, отправьте ID Канала.\nВведите /cancel, чтобы отменить.');

        const idListener = bot.on('message', async (response) => {
            if (response.text === '/cancel') {
                bot.removeListener('message', idListener); 
                return bot.sendMessage(chatId, '❌ Ввод отменен.');
            }

            const channelId = response.text.trim();

            if (!channelId || isNaN(Number(channelId))) {
                return bot.sendMessage(chatId, '❌ Некорректный ID Канал. Попробуйте снова.');
            }

            bot.sendMessage(chatId, 'Теперь отправьте ссылку на Канал.');

            bot.removeListener('message', idListener); 

            const linkListener = bot.on('message', async (linkResponse) => {
                if (linkResponse.text === '/cancel') {
                    bot.removeListener('message', linkListener); 
                    return bot.sendMessage(chatId, '❌ Ввод отменен.');
                }

                const link = linkResponse.text.trim();

                if (!link || !/^https?:\/\/t\.me\/.+/.test(link)) {
                    return bot.sendMessage(chatId, '❌ Некорректная ссылка. Попробуйте снова.');
                }

                try {
                    const result = await setCoreChannel(channelId, link);

                    await bot.sendMessage(chatId, `✅ Канал для подписки успешно установлен!`, {
                        parse_mode: 'HTML'
                    });
                } catch (error) {
                    console.error('Ошибка при установке Core Channel:', error);
                    await bot.sendMessage(chatId, '❌ Произошла ошибка при установке. Попробуйте снова.');
                }

                bot.removeListener('message', linkListener); 
            });
        });
    });
}

function setCoreChatCommand(bot) {
    bot.onText(/\/set_core_chat/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!admins.includes(userId)) {
            return bot.sendMessage(chatId, 'У вас нет прав для выполнения этой команды.');
        }

        await bot.sendMessage(chatId, 'Пожалуйста, отправьте ID Чата.\nВведите /cancel, чтобы отменить.');

        const idListener = bot.on('message', async (response) => {
            if (response.text === '/cancel') {
                bot.removeListener('message', idListener); 
                return bot.sendMessage(chatId, '❌ Ввод отменен.');
            }

            const channelId = response.text.trim();

            if (!channelId || isNaN(Number(channelId))) {
                return bot.sendMessage(chatId, '❌ Некорректный ID Чат. Попробуйте снова.');
            }

            bot.sendMessage(chatId, 'Теперь отправьте ссылку на Чат.');

            bot.removeListener('message', idListener); 

            const linkListener = bot.on('message', async (linkResponse) => {
                if (linkResponse.text === '/cancel') {
                    bot.removeListener('message', linkListener); 
                    return bot.sendMessage(chatId, '❌ Ввод отменен.');
                }

                const link = linkResponse.text.trim();

                if (!link || !/^https?:\/\/t\.me\/.+/.test(link)) {
                    return bot.sendMessage(chatId, '❌ Некорректная ссылка. Попробуйте снова.');
                }

                try {
                    const result = await setCoreChat(channelId, link);

                    await bot.sendMessage(chatId, `✅ Канал для подписки успешно установлен!`, {
                        parse_mode: 'HTML'
                    });
                } catch (error) {
                    console.error('Ошибка при установке Core Channel:', error);
                    await bot.sendMessage(chatId, '❌ Произошла ошибка при установке. Попробуйте снова.');
                }

                bot.removeListener('message', linkListener); 
            });
        });
    });
}

function setListinManagerCommand(bot) {
    bot.onText(/\/set_listing_manager/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!admins.includes(userId)) {
            return bot.sendMessage(chatId, 'У вас нет прав.');
        }

        await bot.sendMessage(chatId, 'Пожалуйста, введите ID нового листинг менеджера.\nВведите /cancel, чтобы отменить.');

        const listener = bot.on('message', async (response) => {
            if (response.text === '/cancel') {
                bot.removeListener('message', listener);
                return bot.sendMessage(chatId, '❌ Ввод отменен.');
            }

            try {
                const newLisitngManager = response.text.trim();

                const setNewListingManager = await setListingManager(newLisitngManager);

                if (setNewListingManager) {
                    await bot.sendMessage(chatId, `✅ Установлен новый Листинг Менеджер.`, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '« Назад', callback_data: 'Menu' }
                                ]
                            ]
                        }
                    });
                } 
                bot.removeListener('message', listener);
            } catch (error) {
                console.error('Ошибка при установлении менеджера:', error);
                await bot.sendMessage(chatId, '❌ Произошла ошибка при установлени менеджера.', {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '« Назад', callback_data: 'Menu' }
                            ]
                        ]
                    }
                });
                bot.removeListener('message', listener);
            }
        });
    });
};

function postCommand(bot) {
    bot.onText(/\/post/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!admins.includes(userId)) {
            return bot.sendMessage(chatId, '❌ У вас нет прав для выполнения этой команды.');
        }

        await bot.sendMessage(chatId, '📸 Отправьте фото для рассылки. Если вы хотите сделать рассылку без фото, введите /nophoto. Для отмены введите /cancel.');

        let photo;
        try {
            photo = await new Promise((resolve, reject) => {
                const listener = bot.on('message', async (response) => {
                    if (response.chat.id !== chatId) return;

                    if (response.text === '/cancel') {
                        bot.removeListener('message', listener);
                        reject('❌ Рассылка отменена.');
                        await bot.sendMessage(chatId, '❌ Рассылка отменена.');
                    } else if (response.text === '/nophoto') {
                        bot.removeListener('message', listener);
                        resolve(null);
                        await bot.sendMessage(chatId, '✏️ Теперь отправьте текст сообщения. Для отмены введите /cancel.');
                    } else if (response.photo) {
                        const fileId = response.photo[response.photo.length - 1].file_id;
                        bot.removeListener('message', listener);
                        resolve(fileId);
                        await bot.sendMessage(chatId, '✏️ Теперь отправьте текст сообщения. Для отмены введите /cancel.');
                    } else {
                        await bot.sendMessage(chatId, '❌ Пожалуйста, отправьте фото или используйте команду /nophoto. Для отмены введите /cancel.');
                    }
                });
            });
        } catch (error) {
            console.log(error); 
            return;
        }

        let messageText;
        try {
            messageText = await new Promise((resolve, reject) => {
                const listener = bot.on('message', async (response) => {
                    if (response.chat.id !== chatId) return;

                    if (response.text === '/cancel') {
                        bot.removeListener('message', listener);
                        reject('❌ Рассылка отменена.');
                        await bot.sendMessage(chatId, '❌ Рассылка отменена.');
                    } else if (response.text) {
                        bot.removeListener('message', listener);
                        resolve(response.text.trim());
                    } else {
                        await bot.sendMessage(chatId, '❌ Пожалуйста, отправьте текст сообщения. Для отмены введите /cancel.');
                    }
                });
            });
        } catch (error) {
            console.log(error); 
            return;
        }

        await bot.sendMessage(chatId, '🚀 Начинаю рассылку...');

        const userIds = await getAllUserIds();
        let successCount = 0;
        let failedCount = 0;

        for (const userId of userIds) {
            try {
                if (photo) {
                    await bot.sendPhoto(userId, photo, { caption: messageText, parse_mode: 'HTML' });
                } else {
                    await bot.sendMessage(userId, messageText, { parse_mode: 'HTML' });
                }
                successCount++;
            } catch (error) {
                if (error.response && error.response.statusCode === 403) {
                    console.warn(`Пользователь ${userId} заблокировал бота. Пропускаем.`);
                    failedCount++;
                } else {
                    console.error(`Ошибка при отправке сообщения пользователю ${userId}:`, error.message);
                    failedCount++;
                }
            }
        }

        await bot.sendMessage(chatId, `✅ Рассылка завершена.\nУспешно: ${successCount}\nНе удалось: ${failedCount}`);
    });
}

function totalChatsCommand(bot) {
    bot.onText(/\/total_chats/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!admins.includes(userId)) {
            return bot.sendMessage(chatId, '❌ У вас нет прав для выполнения этой команды.');
        }

        try {
            const totalChats = await Chat.countDocuments(); 
            await bot.sendMessage(chatId, `📊 Всего созданных чатов: ${totalChats}`);
        } catch (error) {
            console.error('Ошибка при подсчёте чатов:', error.message);
            await bot.sendMessage(chatId, '❌ Произошла ошибка при подсчёте всех чатов.');
        }
    });
}

function privateChatsCommand(bot) {
    bot.onText(/\/private_chats/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!admins.includes(userId)) {
            return bot.sendMessage(chatId, '❌ У вас нет прав для выполнения этой команды.');
        }

        try {
            const privateChats = await Chat.countDocuments({ type: 'private' }); 
            await bot.sendMessage(chatId, `🔒 Всего созданных приватных чатов: ${privateChats}`);
        } catch (error) {
            console.error('Ошибка при подсчёте приватных чатов:', error.message);
            await bot.sendMessage(chatId, '❌ Произошла ошибка при подсчёте приватных чатов.');
        }
    });
}

function userCountCommand(bot) {
    bot.onText(/\/user_count/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!admins.includes(userId)) {
            return bot.sendMessage(chatId, '❌ У вас нет прав для выполнения этой команды.');
        }

        try {
            const userIds = await getAllUserIds();
            const userCount = userIds.length; 

            await bot.sendMessage(chatId, `👥 Всего ${userCount} пользователей.`);
        } catch (error) {
            console.error('Ошибка при получении количества пользователей:', error.message);
            await bot.sendMessage(chatId, '❌ Произошла ошибка при получении количества пользователей.');
        }
    });
}

function commandsListCommand(bot) {
    bot.onText(/\/commands/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!admins.includes(userId)) {
            return bot.sendMessage(chatId, '❌ У вас нет прав для выполнения этой команды.');
        }

        let responseMessage = '<b>Доступные команды:</b>\n\n';

        commandsList.forEach(({ command, description }) => {
            responseMessage += `<b>${command}</b> - ${description}\n`;
        });

        await bot.sendMessage(chatId, responseMessage, { parse_mode: 'HTML' });
    });
}

export async function registerCommands(bot) {
    startCommand(bot);
    addJettonCommand(bot);
    addNFTCommand(bot);
    deleteJettonCommand(bot);
    deleteNFTCommand(bot);
    setJettonListingPriceCommand(bot);
    setNFTListingPriceCommand(bot);
    addNewAdminCommand(bot);
    removeAdminCommand(bot);
    getAdminsCommand(bot);
    getCoreMediaCommand(bot);
    setCoreChannelCommand(bot);
    setCoreChatCommand(bot);
    setListinManagerCommand(bot);
    postCommand(bot);
    userCountCommand(bot);
    totalChatsCommand(bot);
    privateChatsCommand(bot);
    commandsListCommand(bot);
}