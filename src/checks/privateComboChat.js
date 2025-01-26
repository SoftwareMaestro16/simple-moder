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
            const chatIdNum = joinRequest.chat.id;
            const userIdNum = joinRequest.from.id;
        
            console.log(`Запрос на вступление от пользователя ${userIdNum} в чат ${chatIdNum}`);
        
            const chatDoc = await Chat.findOne({ chatId: chatIdNum.toString() });
            if (!chatDoc) {
                console.log(`Чат ${chatIdNum} не найден среди combo-чатов.`);
                await bot.declineChatJoinRequest(chatIdNum, userIdNum); // Отклоняем запрос
                return;
            }
        
            try {
                const walletAddress = await getWalletAddressByUserId(userIdNum.toString());
                if (!walletAddress) {
                    console.log(`Кошелёк не найден для пользователя ${userIdNum}. Отклоняем запрос.`);
                    await bot.declineChatJoinRequest(chatIdNum, userIdNum); // Отклоняем запрос
                    return;
                }
        
                const jettonDecimals = await getJettonDecimals(chatDoc.jetton.jettonAddress);
                const jettonBalance = await getJettonBalance(walletAddress, chatDoc.jetton.jettonAddress, jettonDecimals);
                const nftBalance = (await getNftBalance(walletAddress, chatDoc.nft.collectionAddress)).length;
        
                console.log(`Баланс пользователя ${userIdNum}: Jetton: ${jettonBalance}, NFT: ${nftBalance}`);
        
                // Проверка условий
                if (
                    jettonBalance >= chatDoc.jetton.jettonRequirement &&
                    nftBalance >= chatDoc.nft.nftRequirement
                ) {
                    console.log(`Пользователь ${userIdNum} соответствует требованиям. Одобряем запрос.`);
        
                    await bot.approveChatJoinRequest(chatIdNum, userIdNum);
        
                    const updateResult = await Chat.updateOne(
                        { chatId: chatIdNum.toString() },
                        { $push: { members: userIdNum.toString() } }
                    );
        
                    if (updateResult.modifiedCount > 0) {
                        console.log(`✅ Пользователь ${userIdNum} добавлен в members чата ${chatIdNum}.`);
                    } else {
                        console.error(`❌ Не удалось добавить пользователя ${userIdNum} в members чата ${chatIdNum}.`);
                    }
        
                    await bot.sendMessage(
                        chatIdNum,
                        `🎉 Добро пожаловать, ${joinRequest.from.first_name || 'новый участник'}, в наш приватный чат!`
                    );
                } else {
                    console.log(`Пользователь ${userIdNum} не соответствует требованиям. Отклоняем запрос.`);
                    await bot.declineChatJoinRequest(chatIdNum, userIdNum); // Отклоняем запрос
                }
            } catch (error) {
                console.error(`Ошибка при проверке пользователя ${userIdNum} для чата ${chatIdNum}:`, error.message);
                await bot.declineChatJoinRequest(chatIdNum, userIdNum); // Отклоняем запрос при ошибке
            }
        });

        bot.on('message', async (msg) => {
            if (msg.left_chat_member) {
                const chatIdNum = msg.chat.id;
                const leftUserIdNum = msg.left_chat_member.id;

                console.log(`Пользователь ${leftUserIdNum} покинул чат ${chatIdNum}`);

                const chatDoc = await Chat.findOne({ chatId: chatIdNum.toString() });
                if (!chatDoc) {
                    console.log(`Чат ${chatIdNum} не найден среди combo-чатов.`);
                    return;
                }

                const updateResult = await Chat.updateOne(
                    { chatId: chatIdNum.toString() },
                    { $pull: { members: leftUserIdNum.toString() } }
                );

                if (updateResult.modifiedCount > 0) {
                    console.log(`✅ Пользователь ${leftUserIdNum} удалён из members чата ${chatIdNum}.`);
                } else {
                    console.log(`❌ Пользователь ${leftUserIdNum} не найден в members чата ${chatIdNum}.`);
                }
            }
        });

        setInterval(async () => {
            for (const chat of comboChats) {
                const chatIdNum = chat.chatId;
                console.log(`Проверяем чат ${chatIdNum}`);

                const currentChat = await Chat.findOne({ chatId: chatIdNum.toString() }).select('members').lean();
                if (!currentChat || !currentChat.members.length) {
                    console.log(`Нет участников для проверки в чате ${chatIdNum}.`);
                    continue;
                }

                for (const memberId of currentChat.members) {
                    console.log(`Проверяем участника ${memberId} в чате ${chatIdNum}`);

                    try {
                        const walletAddress = await getWalletAddressByUserId(memberId);
                        if (!walletAddress) {
                            console.log(`У участника ${memberId} нет кошелька. Удаляем.`);
                            await bot.banChatMember(chatIdNum, Number(memberId));
                            await bot.unbanChatMember(chatIdNum, Number(memberId));
                            await Chat.updateOne(
                                { chatId: chatIdNum.toString() },
                                { $pull: { members: memberId.toString() } }
                            );
                            continue;
                        }

                        const jettonDecimals = await getJettonDecimals(chat.jetton.jettonAddress);
                        const jettonBalance = await getJettonBalance(walletAddress, chat.jetton.jettonAddress, jettonDecimals);
                        const nftBalance = (await getNftBalance(walletAddress, chat.nft.collectionAddress)).length;

                        if (
                            jettonBalance < chat.jetton.jettonRequirement ||
                            nftBalance < chat.nft.nftRequirement
                        ) {
                            console.log(`У участника ${memberId} не соблюдены combo-требования. Удаляем.`);
                            await bot.banChatMember(chatIdNum, Number(memberId));
                            await bot.unbanChatMember(chatIdNum, Number(memberId));
                            await Chat.updateOne(
                                { chatId: chatIdNum.toString() },
                                { $pull: { members: memberId.toString() } }
                            );
                        }
                    } catch (err) {
                        console.error(`Ошибка при проверке участника ${memberId} в чате ${chatIdNum}:`, err.message);

                        if (err.message.includes('USER_NOT_PARTICIPANT')) {
                            console.log(`Участник ${memberId} уже не состоит в чате. Удаляем.`);
                            await Chat.updateOne(
                                { chatId: chatIdNum.toString() },
                                { $pull: { members: memberId.toString() } }
                            );
                        }
                    }
                    await delay(2000);
                }
                await delay(3500);
            }
        }, 18000000); 
    } catch (error) {
        console.error('Ошибка в handleComboChats:', error.message);
    }
}