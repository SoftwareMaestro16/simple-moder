import Chat from '../models/Chat.js';
import { getJettonData } from '../utils/getTokensData/getJettonData.js';
import { getCollectionData } from '../utils/getTokensData/getCollectionData.js';

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
                    console.error('Ошибка при удалении предыдущего сообщения:', error.message);
                }
            }

            await bot.sendMessage(
                chatId,
                `❌ Чат с ID ${chatInfo.id} уже добавлен в базу данных!`
            );
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

        if (isCombo) {
            if (jetton?.address) {
                const jettonData = await getJettonData(jetton.address);
                jettonSymbol = jettonData.symbol || jettonSymbol;
            }

            if (nft?.address) {
                const collectionData = await getCollectionData(nft.address);
                nftName = collectionData.name || nftName;
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
        await bot.sendMessage(chatId, '✅ Чат успешно добавлен в базу данных!');
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