import Chat from '../models/Chat.js';
import { getJettonDecimals } from '../db/jettonMethods.js';
import getJettonBalance from '../utils/getUserBalances/getJettonBalance.js';
import { getWalletAddressByUserId } from '../db/userMethods.js';
import { getAllPrivateJettonChats } from '../db/chatMethods.js';
import { delay } from '../utils/defay.js';

export async function handlePrivateJettonChats(bot) {
    try {
        const privateJettonChats = await getAllPrivateJettonChats();

        if (!privateJettonChats.length) {
            console.log('Нет приватных Jetton-чатов для обработки.');
            return;
        }

        bot.on('chat_join_request', async (joinRequest) => {
            if (!joinRequest || !joinRequest.chat || !joinRequest.from) {
                console.error('Некорректный запрос на присоединение к чату.');
                return;
            }

            const chatId = joinRequest.chat.id;
            const userId = joinRequest.from.id;

            console.log(`Запрос на присоединение: пользователь ${userId}, чат ${chatId}`);

            const chatDoc = await Chat.findOne({ chatId });
            if (!chatDoc) {
                console.error(`Чат с chatId ${chatId} не найден.`);
                return;
            }

            if (!chatDoc.jetton || !chatDoc.jetton.jettonAddress) {
                console.error(`Jetton address отсутствует для чата ${chatId}.`);
                return;
            }

            const walletAddress = await getWalletAddressByUserId(userId);
            if (!walletAddress) {
                console.log(`Кошелек пользователя ${userId} не найден. Запрос отклонен.`);
                try {
                    await bot.declineChatJoinRequest(chatId, userId);
                } catch (error) {
                    console.error(`Ошибка при отклонении запроса пользователя ${userId}:`, error.message);
                }
                return;
            }

            const decimals = await getJettonDecimals(chatDoc.jetton.jettonAddress);
            const userBalance = await getJettonBalance(walletAddress, chatDoc.jetton.jettonAddress, decimals);

            if (userBalance >= chatDoc.jetton.jettonRequirement) {
                try {
                    await bot.approveChatJoinRequest(chatId, userId);
                    console.log(`✅ Пользователь ${userId} одобрен. Баланс: ${userBalance}`);
                } catch (error) {
                    console.error(`Ошибка при одобрении запроса пользователя ${userId}:`, error.message);
                    return;
                }

                try {
                    const updateResult = await Chat.updateOne({ chatId }, { $addToSet: { members: userId.toString() } });

                    if (updateResult.matchedCount === 0) {
                        console.error(`❌ Чат с chatId ${chatId} не найден при добавлении пользователя.`);
                    } else {
                        console.log(`✅ Пользователь ${userId} добавлен в members для чата ${chatId}.`);
                    }
                } catch (updateError) {
                    console.error(`Ошибка при обновлении members для чата ${chatId}:`, updateError.message);
                }

                try {
                    await bot.sendMessage(chatId, `🎉 Добро пожаловать, ${joinRequest.from.first_name || 'новый участник'}, в наш приватный чат!`);
                } catch (sendError) {
                    console.error(`Ошибка при отправке приветственного сообщения для пользователя ${userId}:`, sendError.message);
                }
            } else {
                console.log(`❌ Пользователь ${userId} отклонен: баланс ${userBalance} меньше ${chatDoc.jetton.jettonRequirement}`);
                try {
                    await bot.declineChatJoinRequest(chatId, userId);
                } catch (error) {
                    console.error(`Ошибка при отклонении запроса пользователя ${userId}:`, error.message);
                }
            }
        });

        setInterval(async () => {
            for (const chat of privateJettonChats) {
                const chatId = chat.chatId;

                if (!chat.jetton || !chat.jetton.jettonAddress) {
                    console.log(`Пропускаем чат ${chatId}: нет данных о Jetton.`);
                    continue;
                }

                const decimals = await getJettonDecimals(chat.jetton.jettonAddress);
                const currentMembers = await Chat.findOne({ chatId }).select('members').lean();

                if (!currentMembers || !currentMembers.members.length) {
                    console.log(`Нет участников для проверки в чате ${chatId}.`);
                    continue;
                }

                for (const memberId of currentMembers.members) {
                    try {
                        const walletAddress = await getWalletAddressByUserId(memberId);
                        if (!walletAddress) {
                            console.log(`У участника ${memberId} нет кошелька. Удаляем из чата.`);
                            await bot.banChatMember(chatId, memberId);
                            await Chat.updateOne({ chatId }, { $pull: { members: memberId.toString() } });
                            continue;
                        }

                        const userBalance = await getJettonBalance(walletAddress, chat.jetton.jettonAddress, decimals);
                        if (userBalance < chat.jetton.jettonRequirement) {
                            console.log(`Баланс участника ${memberId} недостаточен. Удаляем.`);
                            await bot.banChatMember(chatId, memberId);
                            await Chat.updateOne({ chatId }, { $pull: { members: memberId.toString() } });
                        }
                    } catch (err) {
                        console.error(`Ошибка при проверке участника ${memberId} в чате ${chatId}:`, err.message);
                    }

                    await delay(2750);
                }

                await delay(3750);
            }
        }, 10800000); // 3 hours
    } catch (error) {
        console.error('Ошибка в handlePrivateJettonChats:', error.message);
    }
}