import { getAllComboChats } from '../db/chatMethods.js';
import { getJettonDecimals } from '../db/jettonMethods.js';
import getJettonBalance from '../utils/getUserBalances/getJettonBalance.js';
import getNftBalance from '../utils/getUserBalances/getNftBalance.js';
import { getWalletAddressByUserId } from '../db/userMethods.js';
import { delay } from '../utils/defay.js';
import Chat from '../models/Chat.js';

export async function handleComboChats(bot) {
    try {
        const comboChats = await getAllComboChats();

        if (!comboChats.length) {
            console.log('Нет комбо-чатов для обработки.');
            return;
        }

        console.log(`Обнаружено комбо-чатов: ${comboChats.length}`);

        bot.on('chat_join_request', async (joinRequest) => {
            const chatId = joinRequest.chat.id;
            const userId = joinRequest.from.id;

            console.log(`Получен запрос на вступление от пользователя ${userId} в чат ${chatId}`);

            const chatDoc = comboChats.find((chat) => chat.chatId === chatId.toString());

            if (!chatDoc) {
                console.log(`Чат ${chatId} не найден среди комбо-чатов, запрос игнорируется.`);
                return;
            }

            try {
                const walletAddress = await getWalletAddressByUserId(userId);

                if (!walletAddress) {
                    console.log(`Кошелек не найден для пользователя ${userId}. Отклоняем запрос.`);
                    await bot.declineChatJoinRequest(chatId, userId);
                    return;
                }

                const jettonDecimals = await getJettonDecimals(chatDoc.jetton.jettonAddress);
                const jettonBalance = await getJettonBalance(walletAddress, chatDoc.jetton.jettonAddress, jettonDecimals);

                const nftBalance = (await getNftBalance(walletAddress, chatDoc.nft.collectionAddress)).length;

                console.log(`Баланс пользователя ${userId}:
                Jetton: ${jettonBalance}, Требуется: ${chatDoc.jetton.jettonRequirement}
                NFT: ${nftBalance}, Требуется: ${chatDoc.nft.nftRequirement}`);

                if (
                    jettonBalance >= chatDoc.jetton.jettonRequirement &&
                    nftBalance >= chatDoc.nft.nftRequirement
                ) {
                    console.log(`Пользователь ${userId} соответствует требованиям. Одобряем запрос.`);
                    await bot.approveChatJoinRequest(chatId, userId);

                    // Добавляем пользователя в members
                    const updateResult = await Chat.updateOne(
                        { chatId: chatId.toString() },
                        { $addToSet: { members: userId.toString() } }
                    );

                    if (updateResult.modifiedCount > 0) {
                        console.log(`Пользователь ${userId} добавлен в members чата ${chatId}.`);
                    } else {
                        console.log(`Не удалось обновить members для чата ${chatId}.`);
                    }

                    await bot.sendMessage(
                        chatId,
                        `🎉 Добро пожаловать, ${joinRequest.from.first_name || 'новый участник'}, в наш приватный чат! 🎊`,
                    );
                } else {
                    console.log(`Пользователь ${userId} не соответствует требованиям. Отклоняем запрос.`);
                    await bot.declineChatJoinRequest(chatId, userId);
                }
            } catch (error) {
                console.error(`Ошибка при проверке пользователя ${userId} для чата ${chatId}:`, error.message);
                await bot.declineChatJoinRequest(chatId, userId);
            }
        });

        bot.on('message', async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;

            if (msg.left_chat_member) {
                const leftUserId = msg.left_chat_member.id;
                console.log(`Пользователь ${leftUserId} покинул чат ${chatId}.`);

                // Удаляем пользователя из members
                const updateResult = await Chat.updateOne(
                    { chatId: chatId.toString() },
                    { $pull: { members: leftUserId.toString() } }
                );

                if (updateResult.modifiedCount > 0) {
                    console.log(`Пользователь ${leftUserId} удалён из members чата ${chatId}.`);
                } else {
                    console.log(`Пользователь ${leftUserId} не найден в members чата ${chatId}.`);
                }
            }
        });

        setInterval(async () => {
            console.log('Запущена проверка всех комбо-чатов.');

            for (const chat of comboChats) {
                const chatId = chat.chatId;

                console.log(`Проверяем чат ${chatId}`);

                const currentMembers = await Chat.findOne({ chatId }).select('members').lean();

                if (!currentMembers || !currentMembers.members.length) {
                    console.log(`Нет участников для проверки в чате ${chatId}.`);
                    continue;
                }

                for (const memberId of currentMembers.members) {
                    console.log(`Проверяем участника ${memberId} в чате ${chatId}`);

                    try {
                        const walletAddress = await getWalletAddressByUserId(memberId);

                        if (!walletAddress) {
                            console.log(`У участника ${memberId} в чате ${chatId} нет кошелька. Удаляем.`);
                            await bot.banChatMember(chatId, memberId);
                            await bot.unbanChatMember(chatId, memberId);

                            await Chat.updateOne(
                                { _id: chat._id },
                                { $pull: { members: memberId } }
                            );
                            continue;
                        }

                        const jettonDecimals = await getJettonDecimals(chat.jetton.jettonAddress);
                        const jettonBalance = await getJettonBalance(walletAddress, chat.jetton.jettonAddress, jettonDecimals);

                        const nftBalance = (await getNftBalance(walletAddress, chat.nft.collectionAddress)).length;

                        console.log(`Баланс участника ${memberId}:
                        Jetton: ${jettonBalance}, Требуется: ${chat.jetton.jettonRequirement}
                        NFT: ${nftBalance}, Требуется: ${chat.nft.nftRequirement}`);

                        if (
                            jettonBalance < chat.jetton.jettonRequirement ||
                            nftBalance < chat.nft.nftRequirement
                        ) {
                            console.log(`У участника ${memberId} не соблюдаются оба требования. Удаляем.`);
                            await bot.banChatMember(chatId, memberId);
                            await bot.unbanChatMember(chatId, memberId);
                            await Chat.updateOne(
                                { _id: chat._id },
                                { $pull: { members: memberId } }
                            );
                        }
                    } catch (err) {
                        console.error(`Ошибка при проверке участника ${memberId} в чате ${chatId}:`, err.message);

                        if (err.message.includes('USER_NOT_PARTICIPANT')) {
                            console.log(`Участник ${memberId} уже не состоит в чате. Удаляем из массива.`);
                            await Chat.updateOne(
                                { _id: chat._id },
                                { $pull: { members: memberId } }
                            );
                        }
                    }
                    await delay(2000);
                }
                await delay(3500);
            }

            console.log('Проверка всех чатов завершена.');
        }, 45000);
    } catch (error) {
        console.error('Ошибка в handleComboChats:', error.message);
    }
}