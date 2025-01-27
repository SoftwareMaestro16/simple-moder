import { 
    generateMainKeyboard, 
    generateProfileKeyboard,
    generateJettonListKeyboard,
    generateNFTListKeyboard,
    generateTokenListingKeyboard, 
    generteCreateChatKeyboard,
    generteReturnMainKeyboard,
    generateChoosePrivateChatCategoryKeyboard,
    generateJettonListForSelectKeyboard,
    generateUserChatsKeyboard,
    generatePrivateChatsKeyboard,
    generateWalletsKeyboard
} from "./keyboard.js";
import User from "../models/User.js";
import { getWalletInfo } from "../tonConnect/wallets.js";
import { getConnector } from "../tonConnect/connector.js";
import { generateQRCode } from "../tonConnect/connector.js";
import { toUserFriendlyAddress } from '@tonconnect/sdk';
import { getUserByAddress, updateUserAddress, getUserById} from "../db/userMethods.js";
import { getAllJettonAddressesAndSymbols, getAllJettonSymbols } from "../db/jettonMethods.js";
import { getAllNamesCollection } from "../db/nftMethods.js";
import { getShortAddress } from "../utils/getShortAddress.js";
import { getTokensListingPrice } from "../db/adminMethods.js";
import { getSimpleCoinPrice } from "../utils/getSCPrice.js";
import { loadAdminData } from "../utils/config.js";
import { handleUserChatsPagination } from "../utils/chat/callbackCheckers.js"
import Chat from '../models/Chat.js';
import { getChatRequirements, getPrivateChatsList, getUserChats, isDuplicateChat } from "../db/chatMethods.js";

export async function handleProfile(bot, chatId, messageId) {
    try {
      const user = await getUserById(chatId);
  
      if (!user) {
        await bot.editMessageText('Данные профиля не найдены.', {
          chat_id: chatId,
          message_id: messageId,
        });
        return;
      }
  
      const address = getShortAddress(user.walletAddress) || 'Не Подключен';
  
      const options = generateProfileKeyboard(address);
  
      await bot.editMessageText(
        `👤 <b>Ваш профиль:</b>\n\n` +
        `<b>Имя:</b> <code>${user.userId}</code>\n` +
        `<b>Имя:</b> ${user.firstName}\n` +
        `<b>Username:</b> @${user.userName || 'Не указан'}\n` +
        `<b>Адрес:</b> <code>${address}</code>\n`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: options,
        }
      );
    } catch (error) {
      console.error('Error fetching profile data:', error);
      await bot.editMessageText('Произошла ошибка при загрузке профиля.', {
        chat_id: chatId,
        message_id: messageId,
      });
    }
};

export async function handleDisconnectWallet(bot, chatId, messageId) {
    try {
        const user = await User.findOne({ userId: chatId });

        if (!user) {
            console.error(`Пользователь с ID ${chatId} не найден.`);
            await bot.sendMessage(chatId, '❌ Пользователь не найден. Попробуйте снова.');
            return;
        }

        user.walletAddress = null;
        user.appWalletName = null;

        await user.save();
        // console.log(`Кошелек пользователя с ID ${chatId} успешно отключен.`);

        const keyboard = generateProfileKeyboard('Не Подключен');

        await bot.editMessageText('🔑 Кошелек отключен. Выберите новый для подключения:', {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard,
        });
    } catch (error) {
        console.error('Ошибка при отключении кошелька:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка при отключении кошелька. Попробуйте позже.');
    }
}
  
export async function handleWalletConnection(bot, chatId, walletName, messageId) {
    try {
        const walletInfo = await getWalletInfo(walletName);
  
        if (!walletInfo) {
            await bot.editMessageText(`Кошелек ${walletName} не найден.`, {
                chat_id: chatId,
                message_id: messageId,
            });
            return;
        }
  
        await bot.deleteMessage(chatId, messageId);
  
        const connector = getConnector(chatId);
        let qrMessageId;
  
        connector.onStatusChange(async (wallet) => {
            if (!wallet) {
                console.warn('Disconnected.');
                return;
            }
  
            const userFriendlyAddress = toUserFriendlyAddress(wallet.account.address);
  
            if (!userFriendlyAddress) {
                console.error('Invalid wallet address detected.');
                return;
            }
  
            const existingUser = await getUserByAddress(userFriendlyAddress);

            if (existingUser) {
                if (existingUser.userId !== chatId) {
                    const warningMessage = await bot.sendMessage(
                        chatId,
                        `❌ Кошелек <code>${getShortAddress(userFriendlyAddress)}</code> уже привязан к другому пользователю. Пожалуйста, используйте другой кошелек.`,
                        {
                            parse_mode: 'HTML',
                            chat_id: chatId,
                            message_id: messageId,
                            reply_markup: generateWalletsKeyboard(),
                        }
                    );
                    
                    if (qrMessageId) {
                        await bot.deleteMessage(chatId, qrMessageId);
                    }

                    setTimeout(() => {
                        bot.deleteMessage(chatId, warningMessage.message_id).catch((err) => {
                            console.error('Ошибка при удалении сообщения:', err);
                        });
                    }, 7000);

                    return;
                }
            }

            await updateUserAddress(chatId, userFriendlyAddress, wallet.device.appName);

            if (qrMessageId) {
                await bot.deleteMessage(chatId, qrMessageId);
            }

            bot.sendMessage(
                chatId,
                `🎉 <b>${wallet.device.appName}</b> Кошелек подключен!\n` +
                `Адрес: <code>${getShortAddress(userFriendlyAddress)}</code>`,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Профиль 👤', callback_data: 'Profile' }],
                        ],
                    },
                }
            );
        });
  
        const link = connector.connect({
            bridgeUrl: walletInfo.bridgeUrl,
            universalLink: walletInfo.universalLink,
        });
  
        const qrCode = await generateQRCode(link);
  
        const sentMessage = await bot.sendPhoto(chatId, qrCode, {
            caption: `Отсканируйте QR Code, чтобы подключить ${walletName} Кошелек.`,
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Подключить Кошелек 👛', url: link }],
                ],
            },
        });
  
        qrMessageId = sentMessage.message_id;
    } catch (error) {
        console.error('Ошибка при обработке подключения кошелька:', error);
    }
}

export async function handleDefaultMenu(bot, chatId, messageId) {
    try {
        const user = await getUserById(chatId);
        if (!user) {
            await bot.editMessageText('Данные профиля не найдены.', {
                chat_id: chatId,
                message_id: messageId,
            });
            return;
        }
    
        const address = getShortAddress(user.walletAddress) || 'Не Подключен';
        const options = generateMainKeyboard(address);
    
        await bot.editMessageText(
        '✨ Добро пожаловать! Выберите одну из доступных опций ниже:',
            {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: options
                },
            }
        );
    } catch (error) {
        console.error('Ошибка в handleDefaultMenu:', error);
        await bot.editMessageText('Произошла ошибка. Пожалуйста, попробуйте позже.', {
            chat_id: chatId,
            message_id: messageId,
        });
    }
};

export async function handleJettonList(bot, chatId, messageId) {
    try {
        const symbols = await getAllJettonSymbols();

        if (symbols.length === 0) {
            return bot.editMessageText('❌ В базе данных нет доступных жетонов.', {
                chat_id: chatId, 
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '« Назад', callback_data: 'Menu' }
                        ]
                    ]
                }
            });
        }

        const keyboard = generateJettonListKeyboard(symbols);

        await bot.editMessageText(
            '📋 <b>Список доступных Жетонов:</b>',
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: keyboard
            }
        );
    } catch (error) {
        console.error('Ошибка при обработке списка жетонов:', error);
        await bot.editMessageText('❌ Произошла ошибка при загрузке списка жетонов.', {
            chat_id: chatId,
            message_id: messageId
        });
    }
}

export async function handleCollectionsList(bot, chatId, messageId) {
    try {
        const names = await getAllNamesCollection();

        if (names.length === 0) {
            return bot.editMessageText('❌ В базе данных нет доступных коллекций.', {
                chat_id: chatId,  
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '« Назад', callback_data: 'Menu' }
                        ]
                    ]
                }
            });
        }

        const keyboard = generateNFTListKeyboard(names);

        await bot.editMessageText(
            '📋 <b>Список доступных Коллекций:</b>',
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: keyboard
            }
        );
    } catch (error) {
        console.error('Ошибка при обработке списка коллекций:', error);
        await bot.editMessageText('❌ Произошла ошибка при загрузке списка коллекций.', {
            chat_id: chatId,
            message_id: messageId
        });
    }
}

export async function handleTokensListing(bot, chatId, messageId) {
    try {
        const adminData = await loadAdminData();
        const listingManager = adminData.listingManager;

        const { jettonListingPrice, nftListingPrice } = await getTokensListingPrice();
        const priceSimpleCoin = await getSimpleCoinPrice();

        const jettonPriceInSC = jettonListingPrice / priceSimpleCoin;
        const nftPriceInSc = nftListingPrice / priceSimpleCoin;

        const roundedJettonPriceInSC = Math.ceil(jettonPriceInSC / 100) * 100;
        const roundedNftPriceInSC = Math.ceil(nftPriceInSc / 100) * 100;

        const keyboard = await generateTokenListingKeyboard(listingManager);

        return bot.editMessageText('В Данном разделе предоставлены цены на Листинги Токенов. Ниже вы можете оставить Заявку: \n\n' +
            `Листинг Жетона: <b>${jettonListingPrice}</b> 💲 ~ <code>$SC ${roundedJettonPriceInSC}</code>\n` +
            `Листинг Коллекции: <b>${nftListingPrice}</b> 💲 ~ <code>$SC ${roundedNftPriceInSC}</code>\n\n` +
            `Оплата совершается через <b>$SC</b>.`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: keyboard
            }
        )

    } catch (error) {
        console.error('Ошибка при обработке:', error);
        await bot.editMessageText('❌ Произошла ошибка при загрузке.', {
            chat_id: chatId,
            message_id: messageId
        });
    }
}

export async function handleCreateChat(bot, chatId, messageId) {
    try {
        const keyboard = await generteCreateChatKeyboard();

        return bot.editMessageText(`Выберите какой тип Чата вы хотите добавить:`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: keyboard
            }
        );

    } catch (error) {
        console.error('Ошибка при обработке:', error);
        await bot.editMessageText('❌ Произошла ошибка при загрузке.', {
            chat_id: chatId,
            message_id: messageId
        });
    }
}


export async function handlePrivateChatSetup(bot, chatId, messageId) {
    try {
        await bot.editMessageText(
            `📋 <b>Добавление приватного чата:</b>\n\n` +
            `Введите <code>ID</code> чата, в который вы хотите добавить бота. Убедитесь, что бот добавлен в администраторы.`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: await generteReturnMainKeyboard(),
            }
        );

        const typeOfChat = 'private';

        const listener = async (message) => {
            if (message.chat.id !== chatId) return;

            clearTimeout(timeoutId);
            bot.removeListener('message', listener);

            const chatIdInput = message.text;

            if (!/^-?\d+$/.test(chatIdInput)) {
                await bot.sendMessage(
                    chatId,
                    '❌ Некорректный ID. Попробуйте снова начать процесс добавления чата.'
                );
                return;
            }

            const duplicateChat = await isDuplicateChat(chatIdInput);
            if (duplicateChat) {
                await bot.sendMessage(
                    chatId,
                    `❌ Чат с ID ${chatIdInput} уже существует в базе данных. Попробуйте снова начать процесс добавления.`
                );
                return;
            }

            const chatInfo = await bot.getChat(chatIdInput).catch(() => null);

            if (!chatInfo) {
                await bot.sendMessage(
                    chatId,
                    '❌ Не удалось получить данные чата. Проверьте ID и права. Попробуйте снова начать процесс добавления.'
                );
                return;
            }

            if (chatInfo.type !== 'group' && chatInfo.type !== 'supergroup') {
                await bot.sendMessage(
                    chatId,
                    '❌ Нельзя добавить чат, который не является группой или супергруппой. Попробуйте снова начать процесс добавления.'
                );
                return;
            }

            const chatAdmins = await bot.getChatAdministrators(chatIdInput).catch(() => []);
            const isAdmin = chatAdmins.some((admin) => admin.user.id === message.from.id);

            if (!isAdmin) {
                await bot.sendMessage(
                    chatId,
                    '❌ Вы не являетесь администратором этого чата. Добавление невозможно. Попробуйте снова начать процесс добавления.'
                );
                return;
            }

            await bot.sendMessage(
                chatId,
                `✅ <b>Чат найден!</b>\n\nТеперь выберите категорию для настройки.`,
                {
                    parse_mode: 'HTML',
                    reply_markup: generateChoosePrivateChatCategoryKeyboard(),
                }
            );

            bot.context = { chatIdInput, chatInfo, typeOfChat };
        };

        const timeoutId = setTimeout(async () => {
            bot.removeListener('message', listener); // Удаляем обработчик при истечении времени
            await bot.sendMessage(chatId, '❌ Время ожидания истекло. Попробуйте снова начать процесс добавления чата.');
        }, 10 * 60 * 1000);

        bot.once('message', listener);
    } catch (error) {
        console.error('Ошибка в handlePrivateChatSetup:', error);
    }
}

export async function handlePublicChatSetup(bot, chatId, messageId) {
    try {
        await bot.editMessageText(
            `📋 <b>Добавление публичного чата:</b>\n\n` +
            `Введите <code>ID</code> чата, в который вы хотите добавить бота. Убедитесь, что бот добавлен в администраторы.`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: await generteReturnMainKeyboard(),
            }
        );

        const typeOfChat = 'public';

        const listener = async (message) => {
            if (message.chat.id !== chatId) return;

            clearTimeout(timeoutId);
            bot.removeListener('message', listener);

            const chatIdInput = message.text;

            if (!/^-?\d+$/.test(chatIdInput)) {
                await bot.sendMessage(
                    chatId,
                    '❌ Некорректный ID. Попробуйте снова начать процесс добавления чата.'
                );
                return;
            }

            const duplicateChat = await isDuplicateChat(chatIdInput);
            if (duplicateChat) {
                await bot.sendMessage(
                    chatId,
                    `❌ Чат с ID ${chatIdInput} уже существует в базе данных. Попробуйте снова начать процесс добавления.`
                );
                return;
            }

            const chatInfo = await bot.getChat(chatIdInput).catch(() => null);

            if (!chatInfo) {
                await bot.sendMessage(
                    chatId,
                    '❌ Не удалось получить данные чата. Проверьте ID и права. Попробуйте снова начать процесс добавления.'
                );
                return;
            }

            if (chatInfo.type !== 'group' && chatInfo.type !== 'supergroup') {
                await bot.sendMessage(
                    chatId,
                    '❌ Нельзя добавить чат, который не является группой или супергруппой. Попробуйте снова начать процесс добавления.'
                );
                return;
            }

            const chatAdmins = await bot.getChatAdministrators(chatIdInput).catch(() => []);
            const isAdmin = chatAdmins.some((admin) => admin.user.id === message.from.id);

            if (!isAdmin) {
                await bot.sendMessage(
                    chatId,
                    '❌ Вы не являетесь администратором этого чата. Добавление невозможно. Попробуйте снова начать процесс добавления.'
                );
                return;
            }

            const jettons = await getAllJettonAddressesAndSymbols();

            if (jettons.length === 0) {
                await bot.sendMessage(
                    chatId,
                    '❌ В базе данных нет доступных жетонов. Попробуйте снова начать процесс добавления.'
                );
                return;
            }

            const keyboard = generateJettonListForSelectKeyboard(jettons);

            await bot.sendMessage(
                chatId,
                `✅ <b>Чат найден!</b>\n\nТеперь выберите жетон для настройки доступа.`,
                {
                    parse_mode: 'HTML',
                    reply_markup: keyboard,
                }
            );

            bot.context = { chatIdInput, chatInfo, typeOfChat };
        };

        const timeoutId = setTimeout(async () => {
            bot.removeListener('message', listener); 
            await bot.sendMessage(chatId, '❌ Время ожидания истекло. Попробуйте снова начать процесс добавления чата.');
        }, 10 * 60 * 1000);

        bot.once('message', listener);
    } catch (error) {
        console.error('Ошибка в handlePublicChatSetup:', error);
    }
}

export async function handleUserChats(bot, chatId, messageId) {
    try {
        const userChats = await getUserChats(chatId);

        if (!userChats.length) {
            await bot.editMessageText(
                '❌ У вас пока нет созданных чатов.',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: {
                        inline_keyboard: [[{ text: '« Назад', callback_data: 'Menu' }]],
                    },
                }
            );
            return;
        }

        const keyboard = generateUserChatsKeyboard(userChats);

        const totalUserChats = userChats.length;
        const messageText = `📋 <b>Ваши чаты:</b>\n\nВыберите один из чатов ниже:\n\n<b>Всего чатов:</b> ${totalUserChats}`;

        await bot.editMessageText(messageText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: keyboard,
        });
    } catch (error) {
        console.error('Ошибка в handleUserChats:', error.message);
    }
}

export async function handleUserChatInfo(bot, callbackData, chatId, messageId) {
    try {
        const parts = callbackData.split('_'); 
        const chatIdFromCallback = parts[2];
        const currentPage = parts[3];

        const chat = await Chat.findOne({ chatId: chatIdFromCallback });

        if (!chat) {
            await bot.editMessageText('❌ Чат не найден.', {
                chat_id: chatId,
                message_id: messageId,
            });
            return;
        }

        const type = chat.type === 'private' ? 'Приватный' : 'Публичный';

        let chatInfoText = `📋 <b>Информация о чате:</b>\n\n`;
        chatInfoText += `<b>Тип:</b> ${type}\n\n`;

        if (chat.jetton && chat.jetton.symbol && chat.jetton.jettonRequirement) {
            chatInfoText += `🪙 Jetton: ${chat.jetton.jettonRequirement} $${chat.jetton.symbol}\n`;
            chatInfoText += `- <a href="https://swap.coffee/dex?ft=TON&st=${chat.jetton.jettonAddress}">Купить ${chat.jetton.symbol}</a>\n\n`;
        }

        if (chat.nft && chat.nft.name && chat.nft.nftRequirement) {
            chatInfoText += `🖼 NFT: ${chat.nft.nftRequirement}шт. ${chat.nft.name}\n`;
            chatInfoText += `- <a href="https://getgems.io/collection/${chat.nft.collectionAddress}">Купить NFT</a>\n\n`;
        }

        if (chat.comboCheck) {
            chatInfoText += '💫 Необходимо выполнить все требования.\n\n';
        }

        const keyboard = {
            inline_keyboard: [
                [{ text: '🎫 Перейти в Чат 🔑', url: chat.inviteLink }],
                [{ text: '🗑️ Удалить Чат ❌', callback_data: `mychat_delete_${chatIdFromCallback}_${currentPage}` }],
                [{ text: '« Назад', callback_data: `chats_page_${currentPage}` }],
            ],
        };

        await bot.editMessageText(chatInfoText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: keyboard,
        });
    } catch (error) {
        console.error('Ошибка в handleUserChatInfo:', error.message);
    }
}

export async function handleUserChatDelete(bot, callbackData, chatId, messageId) {
    try {
        const parts = callbackData.split('_');
        const chatIdFromCallback = parts[2];
        const currentPage = parseInt(parts[3], 10);

        await Chat.findOneAndDelete({ chatId: chatIdFromCallback });

        await bot.editMessageText('✅ Чат удалён!', {
            chat_id: chatId,
            message_id: messageId,
        });

        await handleUserChatsPagination(bot, `chats_page_${currentPage}`, chatId, messageId);
    } catch (error) {
        console.error('Ошибка в handleUserChatDelete:', error.message);
        await bot.sendMessage(chatId, '❌ Произошла ошибка при удалении чата. Попробуйте позже.');
    }
}

export async function handlePrivateChatsList(bot, chatId, messageId) {
    try {
        const privateChats = await getPrivateChatsList();

        if (!privateChats.length) {
            await bot.editMessageText(
                '❌ Нет доступных приватных чатов.',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: {
                        inline_keyboard: [[{ text: '« Назад', callback_data: 'Menu' }]],
                    },
                }
            );
            return;
        }

        const keyboard = generatePrivateChatsKeyboard(privateChats);

        const totalPrivateChats = privateChats.length; 
        const chatListText = `📋 <b>Список приватных чатов:</b>\n\nВыберите чат для просмотра.\n\n<b>Всего приватных чатов:</b> ${totalPrivateChats}`;

        await bot.editMessageText(chatListText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: keyboard,
        });
    } catch (error) {
        console.error('Ошибка в handlePrivateChatsList:', error.message);
    }
}

export async function handleChatRequirements(bot, callbackData, chatId, messageId) {
    try {
        const parts = callbackData.split('_'); 
        const chatIdFromCallback = parts[2];
        const currentPage = parts[3] || 1; 

        const chatData = await getChatRequirements(chatIdFromCallback);

        if (!chatData) {
            await bot.editMessageText(
                '❌ Чат не найден.',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: {
                        inline_keyboard: [[{ text: '« Назад', callback_data: `private_page_${currentPage}` }]],
                    },
                }
            );
            return;
        }

        const keyboard = {
            inline_keyboard: [
                [{ text: '🍑 Вступить в Чат 💬', url: chatData.inviteLink }],
                [{ text: '« Назад', callback_data: `private_page_${currentPage}` }], 
            ],
        };

        await bot.editMessageText(
            chatData.text,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: keyboard,
            }
        );
    } catch (error) {
        console.error('Ошибка в handleChatRequirements:', error.message);
    }
}