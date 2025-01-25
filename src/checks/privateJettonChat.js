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

        console.log(`Обнаружено приватных Jetton-чатов: ${privateJettonChats.length}`);

        bot.on('chat_join_request', async (joinRequest) => {
            console.log(`Получен запрос от пользователя ${joinRequest?.from?.id || 'неизвестный'} для чата ${joinRequest?.chat?.id || 'неизвестный'}`);
        
            if (!joinRequest || !joinRequest.chat || !joinRequest.from) {
                console.log('Пустой или некорректный запрос, пропускаем.');
                return;
            }
        
            const chatId = joinRequest.chat.id;
            const userId = joinRequest.from.id;
        
            const chatDoc = privateJettonChats.find((c) => c.chatId === chatId.toString());
            if (!chatDoc) {
                console.log(`Чат ${chatId} не найден среди приватных Jetton-чатов, запрос игнорируется.`);
                return;
            }
        
            const walletAddress = await getWalletAddressByUserId(userId);
        
            if (!walletAddress) {
                await bot.declineChatJoinRequest(chatId, userId);
                console.log(`Пользователь ${userId} отклонён: кошелёк не найден.`);
                return;
            }
        
            console.log(`Пользователь ${userId}, кошелёк: ${walletAddress}`);
        
            const decimals = await getJettonDecimals(chatDoc.jetton.jettonAddress);
            const userBalance = await getJettonBalance(walletAddress, chatDoc.jetton.jettonAddress, decimals);
        
            console.log(`Баланс пользователя ${userId}: ${userBalance}, требуемый баланс: ${chatDoc.jetton.jettonRequirement}`);
        
            if (userBalance >= chatDoc.jetton.jettonRequirement) {
                await bot.approveChatJoinRequest(chatId, userId);
                await Chat.updateOne(
                    { _id: chatDoc._id },
                    { $addToSet: { members: userId.toString() } }
                );
        
                console.log(`Пользователь ${userId} одобрен в чат ${chatId}. Баланс: ${userBalance}`);
        
                await bot.sendMessage(
                    chatId,
                    `🎉 Добро пожаловать, ${joinRequest.from.first_name}, в наш приватный чат!`,
                );
            } else {
                await bot.declineChatJoinRequest(chatId, userId);
                console.log(`Пользователь ${userId} отклонён: баланс ${userBalance} меньше требуемого ${chatDoc.jetton.jettonRequirement}`);
            }
        });

        setInterval(async () => {
            console.log('Запущена проверка всех чатов.');
        
            for (const chat of privateJettonChats) {
                const chatId = chat.chatId;
        
                console.log(`Проверяем чат ${chatId}`);
        
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
        
                        const userBalance = await getJettonBalance(
                            walletAddress,
                            chat.jetton.jettonAddress,
                            decimals
                        );
        
                        console.log(`Баланс участника ${memberId}: ${userBalance}, требуемый: ${chat.jetton.jettonRequirement}`);
        
                        if (userBalance < chat.jetton.jettonRequirement) {
                            console.log(`У участника ${memberId} недостаточно баланса. Удаляем.`);
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
                    await delay(2750); 
                }
                await delay(3750); 
            }
        
            console.log('Проверка всех чатов завершена.');
        }, 45000);
    } catch (error) {
        console.error('Ошибка в handlePrivateJettonChats:', error.message);
    }
}