import Chat from '../models/Chat.js';
import { getJettonData } from '../utils/getTokensData/getJettonData.js';
import { getCollectionData } from '../utils/getTokensData/getCollectionData.js';
import { generteReturnMainKeyboard } from '../interactions/keyboard.js';
import { toUserFriendlyAddress } from "@tonconnect/sdk";

export async function addChatToDatabase(bot, callbackQuery) {
    try {
        if (!callbackQuery || !callbackQuery.message) {
            throw new Error('callbackQuery или callbackQuery.message отсутствует');
        }

        if (bot.context.isProcessing) {
            console.log('⚠️ Операция уже выполняется. Прерывание.');
            return;
        }
        bot.context.isProcessing = true;

        const chatId = callbackQuery.message.chat.id;
        const { chatInfo, jetton, nft, typeOfChat } = bot.context;

        const existingChat = await Chat.findOne({ chatId: chatInfo.id });
        if (existingChat) {
            if (bot.context.lastMessageId) {
                try {
                    await bot.deleteMessage(chatId, bot.context.lastMessageId);
                } catch (error) {
                    if (error.response?.error_code === 400) {
                        console.warn('⚠️ Сообщение уже удалено:', error.message);
                    } else {
                        throw error;
                    }
                }
            }

            await bot.sendMessage(chatId, `❌ Чат с ID ${chatInfo.id} уже добавлен в базу данных!`);
            return;
        }

        const isCombo = Boolean(jetton && nft);
        let jettonSymbol = jetton?.symbol || 'N/A';
        let nftName = nft?.name || 'Название отсутствует';

        if (jetton?.address) {
            try {
                const jettonData = await getJettonData(jetton.address);
                jettonSymbol = jettonData?.symbol || jettonSymbol;
            } catch (error) {
                console.error('Ошибка получения данных жетона:', error.message);
            }
        }

        if (nft?.address) {
            try {
                const collectionData = await getCollectionData(nft.address);
                nftName = collectionData?.name || nftName;
            } catch (error) {
                console.error('Ошибка получения данных коллекции:', error.message);
            }
        }

        const newChat = new Chat({
            chatId: chatInfo.id,
            name: chatInfo.title,
            type: typeOfChat,
            inviteLink: chatInfo.invite_link,
            jetton: jetton
                ? {
                    jettonAddress: jetton.address,
                    symbol: jettonSymbol,
                    jettonRequirement: jetton.amount,
                }
                : undefined,
            nft: nft
                ? {
                    collectionAddress: nft.address,
                    name: nftName,
                    nftRequirement: nft.amount,
                }
                : undefined,
            comboCheck: isCombo,
            adminId: callbackQuery.from.id,
        });

        await newChat.save();

        if (bot.context.lastMessageId) {
            try {
                await bot.deleteMessage(chatId, bot.context.lastMessageId);
                bot.context.lastMessageId = null;
            } catch (error) {
                if (error.response?.error_code === 400) {
                    console.warn('⚠️ Сообщение уже удалено:', error.message);
                } else {
                    throw error;
                }
            }
        }

        const keyboard = await generteReturnMainKeyboard();
        await bot.sendMessage(chatId, '✅ Чат успешно добавлен!', {
            reply_markup: keyboard,
        });
    } catch (error) {
        console.error('Ошибка при добавлении чата в базу данных:', error.message);

        try {
            await bot.sendMessage(
                callbackQuery?.message?.chat?.id || bot.context.chatInfo?.id,
                '❌ Ошибка при добавлении чата. Попробуйте снова.'
            );
        } catch (sendError) {
            console.error('Ошибка при отправке сообщения об ошибке:', sendError.message);
        }
    } finally {
        bot.context.isProcessing = false;
        bot.context = {};
    }
}

export async function isDuplicateChat(chatIdInput) {
    try {
        const existingChat = await Chat.findOne({ chatId: chatIdInput });
        return existingChat; 
    } catch (error) {
        console.error('Ошибка при проверке дубликатов чата:', error.message);
        throw new Error('Не удалось проверить чат на дубликат.');
    }
}

export async function getUserChats(userId) {
    try {
        const userChats = await Chat.find({ adminId: userId });
        return userChats;
    } catch (error) {
        console.error('Ошибка при получении чатов пользователя:', error.message);
        throw new Error('Не удалось получить чаты пользователя.');
    }
}

export async function getPrivateChatsList() {
    try {
        const privateChats = await Chat.find({ type: 'private' }); 
        return privateChats;
    } catch (error) {
        console.error('Ошибка при получении списка приватных чатов:', error.message);
        throw new Error('Не удалось получить список приватных чатов.');
    }
}

export async function getChatRequirements(chatIdFromCallback) {
    try {
        const chat = await Chat.findOne({ chatId: chatIdFromCallback });

        if (!chat) {
            return null;
        }

        let requirementsText = '⭐️ Чтобы вступить необходимо:\n\n';

        if (chat.jetton && chat.jetton.symbol && chat.jetton.jettonRequirement) {
            requirementsText += `🪙 Jetton: ${chat.jetton.jettonRequirement} $${chat.jetton.symbol}\n`;
            requirementsText += `- <a href="https://swap.coffee/dex?ft=TON&st=${toUserFriendlyAddress(chat.jetton.jettonAddress)}">Купить ${chat.jetton.symbol}</a>\n\n`;
        }

        if (chat.nft && chat.nft.name && chat.nft.nftRequirement) {
            requirementsText += `🖼 NFT: ${chat.nft.nftRequirement}шт. ${chat.nft.name}\n`;
            requirementsText += `- <a href="https://getgems.io/collection/${toUserFriendlyAddress(chat.nft.collectionAddress)}">Купить NFT</a>\n`;
        }

        if (chat.comboCheck) {
            requirementsText += '\n💫 Требуется выполнение всех условий.\n';
        }

        return {
            text: requirementsText,
            inviteLink: chat.inviteLink,
        };
    } catch (error) {
        console.error('Ошибка при получении требований чата:', error.message);
        throw new Error('Не удалось получить данные чата.');
    }
}

export async function getAllPublicChats() {
    try {
        const publicChats = await Chat.find({ type: 'public' })
            .select('chatId name jetton');
        return publicChats;
    } catch (error) {
        console.error('Ошибка при получении публичных чатов:', error.message);
        throw new Error('Не удалось получить публичные чаты.');
    }
}

export async function getAllPrivateJettonChats() {
    try {
        console.log('Запрос на получение всех приватных чатов с требованиями по жетонам...');
        const privateJettonChats = await Chat.find({
            type: 'private',
            'jetton.jettonAddress': { $exists: true, $ne: '' },
            'jetton.jettonRequirement': { $exists: true, $gt: 0 },
        });

        return privateJettonChats;
    } catch (error) {
        console.error('Ошибка при получении приватных чатов с требованиями по жетонам:', error.message);
        throw new Error('Не удалось получить приватные чаты с требованиями по жетонам.');
    }
}

export async function getAllPrivateNftChats() {
    try {
        const privateNftChats = await Chat.find({
            type: 'private',
            'nft.collectionAddress': { $exists: true, $ne: '' },
            'nft.nftRequirement': { $exists: true, $gt: 0 },
        });
        return privateNftChats;
    } catch (error) {
        console.error('Ошибка при получении приватных чатов с требованиями по NFT:', error.message);
        throw new Error('Не удалось получить приватные чаты с требованиями по NFT.');
    }
}

export async function getAllComboChats() {
    try {
        console.log('Запрос на получение всех комбо-чатов...');
        const comboChats = await Chat.find({
            type: 'private',
            'jetton.jettonAddress': { $exists: true, $ne: '' },
            'jetton.jettonRequirement': { $exists: true, $gt: 0 },
            'nft.collectionAddress': { $exists: true, $ne: '' },
            'nft.nftRequirement': { $exists: true, $gt: 0 },
            comboCheck: true,  
        });

        return comboChats;
    } catch (error) {
        console.error('Ошибка при получении комбо-чатов:', error.message);
        throw new Error('Не удалось получить комбо-чаты.');
    }
}