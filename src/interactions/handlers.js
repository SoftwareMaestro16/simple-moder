import { 
    generateMainKeyboard, 
    generateProfileKeyboard,
    generateJettonListKeyboard,
    generateNFTListKeyboard,
    generateTokenListingKeyboard, 
    generteCreateChatKeyboard,
    generteReturnMainKeyboard,
    generateChoosePrivateChatCategoryKeyboard,
    generateJettonListForSelectKeyboard
} from "./keyboard.js";
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
import { isDuplicateChat } from "../db/chatMethods.js";

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
    await updateUserAddress(chatId, null, null);
  
    const keyboard = generateProfileKeyboard('Не Подключен');
  
    await bot.editMessageText('🔑 Кошелек отключен. Выберите новый для подключения:', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
    }); 
};
  
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
  
            if (wallet) {
                const userFriendlyAddress = toUserFriendlyAddress(wallet.account.address);
  
                if (!userFriendlyAddress) {
                    console.error('Invalid wallet address detected.');
                    return;
                }
  
                const existingUser = await getUserByAddress(userFriendlyAddress);
  
                if (existingUser) {
                    if (qrMessageId) {
                        await bot.deleteMessage(chatId, qrMessageId);
                    }
  
                    await bot.sendMessage(
                        chatId,
                        '❌ Данный кошелек уже был подключен ранее. Пожалуйста, используйте другой кошелек.',
                        generateMainKeyboard()
                    );
                    return;
                }
  
                updateUserAddress(chatId, userFriendlyAddress, wallet.device.appName);
  
                if (qrMessageId) {
                    await bot.deleteMessage(chatId, qrMessageId);
                }
  
                bot.sendMessage(
                    chatId,
                    `🎉 <b>${wallet.device.appName}</b> Кошелек Подключен!\n` +
                    `Адрес: <code>${getShortAddress(userFriendlyAddress)}</code>`,
                    {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: 'Профиль 👤', callback_data: 'Profile' },
                                ],
                            ],
                        },
                    }
                );
            } else {
                bot.sendMessage(chatId, 'Кошелек Отключен.');
            }
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
                    [
                        {
                            text: 'Подключить Кошелек 👛',
                            url: link,
                        },
                    ],
                ],
            },
        });
  
        qrMessageId = sentMessage.message_id;
    } catch (error) {
        console.error('Error handling wallet connection:', error);
        bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
    }
};

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
            `Оплата совершается с помощью Жетона <b>$SC</b>.`,
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

        bot.once('message', async (message) => {
            const chatIdInput = message.text;

            if (!/^-?\d+$/.test(chatIdInput)) {
                await bot.sendMessage(chatId, '❌ Некорректный ID. Попробуйте еще раз.');
                return;
            }

            const duplicateChat = await isDuplicateChat(chatIdInput);
            if (duplicateChat) {
                await bot.sendMessage(
                    chatId,
                    `❌ Чат с ID ${chatIdInput} уже существует в базе данных.\n\n`
                );
                return;
            }

            const chatInfo = await bot.getChat(chatIdInput).catch(() => null);

            if (!chatInfo) {
                await bot.sendMessage(chatId, '❌ Не удалось получить данные чата. Проверьте ID и права.');
                return;
            }

            await bot.sendMessage(
                chatId,
                `✅ <b>Чат найден!</b>\n\n` +
                `Теперь выберите категорию для настройки.`,
                {
                    parse_mode: 'HTML',
                    reply_markup: generateChoosePrivateChatCategoryKeyboard(),
                }
            );

            bot.context = { chatIdInput, chatInfo, typeOfChat };
        });
    } catch (error) {
        console.error('Ошибка в handlePrivateChatSetup:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.');
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

        bot.once('message', async (message) => {
            const chatIdInput = message.text;

            if (!/^-?\d+$/.test(chatIdInput)) {
                await bot.sendMessage(chatId, '❌ Некорректный ID. Попробуйте еще раз.');
                return;
            }

            const duplicateChat = await isDuplicateChat(chatIdInput);
            if (duplicateChat) {
                await bot.sendMessage(
                    chatId,
                    `❌ Чат с ID ${chatIdInput} уже существует в базе данных.\n\n`
                );
                return;
            }

            const chatInfo = await bot.getChat(chatIdInput).catch(() => null);

            if (!chatInfo) {
                await bot.sendMessage(chatId, '❌ Не удалось получить данные чата. Проверьте ID и права.');
                return;
            }

            // Открываем выбор жетонов после подтверждения
            const jettons = await getAllJettonAddressesAndSymbols();

            if (jettons.length === 0) {
                await bot.sendMessage(chatId, '❌ В базе данных нет доступных жетонов.');
                return;
            }

            const keyboard = generateJettonListForSelectKeyboard(jettons);

            await bot.sendMessage(
                chatId,
                `✅ <b>Чат найден!</b>\n\n` +
                `Теперь выберите жетон для настройки доступа.`,
                {
                    parse_mode: 'HTML',
                    reply_markup: keyboard,
                }
            );

            bot.context = { chatIdInput, chatInfo, typeOfChat };
        });
    } catch (error) {
        console.error('Ошибка в handlePublicChatSetup:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.');
    }
}