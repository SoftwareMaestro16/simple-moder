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
            // console.log('Нет комбо-чатов для обработки.');
            return;
        }

        // console.log(`Обнаружено комбо-чатов: ${comboChats.length}`);

        bot.on('chat_join_request', async (joinRequest) => {
            const chatIdNum = joinRequest.chat.id;   
            const userIdNum = joinRequest.from.id;   

            // console.log(`\n--- Запрос на вступление от пользователя ${userIdNum} в чат ${chatIdNum} ---`);

            const chatDoc = comboChats.find(c => c.chatId === chatIdNum.toString());
            if (!chatDoc) {
                // console.log(`Чат ${chatIdNum} не найден среди combo-чатов, запрос игнорируется.`);
                return;
            }

            try {
                const walletAddress = await getWalletAddressByUserId(userIdNum.toString());
                if (!walletAddress) {
                    // console.log(`Кошелёк не найден для пользователя ${userIdNum}. Отклоняем запрос.`);
                    await bot.declineChatJoinRequest(chatIdNum, userIdNum);
                    return;
                }

                const jettonDecimals = await getJettonDecimals(chatDoc.jetton.jettonAddress);
                const jettonBalance = await getJettonBalance(walletAddress, chatDoc.jetton.jettonAddress, jettonDecimals);

                const nftBalance = (await getNftBalance(walletAddress, chatDoc.nft.collectionAddress)).length;

                // console.log(`Баланс пользователя ${userIdNum}:
                //   Jetton: ${jettonBalance}, Требуется: ${chatDoc.jetton.jettonRequirement}
                //   NFT: ${nftBalance}, Требуется: ${chatDoc.nft.nftRequirement}
                // `);

                if (
                    jettonBalance >= chatDoc.jetton.jettonRequirement &&
                    nftBalance >= chatDoc.nft.nftRequirement
                ) {
                    // console.log(`Пользователь ${userIdNum} соответствует требованиям. Одобряем запрос.`);
                    await bot.approveChatJoinRequest(chatIdNum, userIdNum);

                    const updateResult = await Chat.updateOne(
                        { _id: chatDoc._id },
                        { $addToSet: { members: userIdNum.toString() } }
                    );

                    if (updateResult.modifiedCount > 0) {
                        // console.log(`Пользователь ${userIdNum} добавлен в members чата ${chatIdNum}.`);
                    } else {
                        // console.log(`Не удалось обновить members для чата ${chatIdNum}.`);
                    }

                    await bot.sendMessage(
                        chatIdNum,
                        `🎉 Добро пожаловать, ${joinRequest.from.first_name || 'новый участник'}, в наш приватный чат! 🎊`
                    );
                } else {
                    // console.log(`Пользователь ${userIdNum} не соответствует требованиям. Отклоняем запрос.`);
                    await bot.declineChatJoinRequest(chatIdNum, userIdNum);
                }
            } catch (error) {
                console.error(`Ошибка при проверке пользователя ${userIdNum} для чата ${chatIdNum}:`, error.message);
                await bot.declineChatJoinRequest(chatIdNum, userIdNum);
            }
        });

        bot.on('message', async (msg) => {
            if (msg.left_chat_member) {
                const chatIdNum = msg.chat.id;
                const leftUserIdNum = msg.left_chat_member.id;
                // console.log(`\n--- Пользователь ${leftUserIdNum} покинул чат ${chatIdNum} ---`);

                const chatDoc = comboChats.find(c => c.chatId === chatIdNum.toString());
                if (!chatDoc) {
                    // console.log(`Чат ${chatIdNum} не найден среди combo-чатов, пропускаем.`);
                    return;
                }

                const updateResult = await Chat.updateOne(
                    { _id: chatDoc._id },
                    { $pull: { members: leftUserIdNum.toString() } }
                );

                if (updateResult.modifiedCount > 0) {
                    // console.log(`Пользователь ${leftUserIdNum} удалён из members чата ${chatIdNum}.`);
                } else {
                    // console.log(`Пользователь ${leftUserIdNum} не найден в members чата ${chatIdNum}.`);
                }
            }
        });

        setInterval(async () => {
            // console.log('\n===== Запущена проверка всех комбо-чатов =====');

            for (const chat of comboChats) {
                const chatIdNum = Number(chat.chatId); 
                // console.log(`\nПроверяем чат ${chat.chatId} (ID для Telegram: ${chatIdNum})`);

                const currentChat = await Chat.findOne({ _id: chat._id }).select('members').lean();
                if (!currentChat || !currentChat.members.length) {
                    // console.log(`Нет участников для проверки в чате ${chat.chatId}.`);
                    continue;
                }

                for (const memberIdStr of currentChat.members) {
                    // console.log(`Проверяем участника ${memberIdStr} (в чате ${chat.chatId})`);

                    try {
                        const walletAddress = await getWalletAddressByUserId(memberIdStr);
                        if (!walletAddress) {
                            // console.log(`У участника ${memberIdStr} нет кошелька. Удаляем из чата.`);
                            await bot.banChatMember(chatIdNum, Number(memberIdStr));
                            await bot.unbanChatMember(chatIdNum, Number(memberIdStr));
                            await Chat.updateOne(
                                { _id: chat._id },
                                { $pull: { members: memberIdStr } }
                            );
                            continue;
                        }

                        const jettonDecimals = await getJettonDecimals(chat.jetton.jettonAddress);
                        const jettonBalance = await getJettonBalance(walletAddress, chat.jetton.jettonAddress, jettonDecimals);
                        const nftBalance = (await getNftBalance(walletAddress, chat.nft.collectionAddress)).length;

                        // console.log(`Баланс участника ${memberIdStr}:
                        //   Jetton: ${jettonBalance}, Требуется: ${chat.jetton.jettonRequirement}
                        //   NFT: ${nftBalance}, Требуется: ${chat.nft.nftRequirement}
                        // `);

                        if (
                            jettonBalance < chat.jetton.jettonRequirement ||
                            nftBalance < chat.nft.nftRequirement
                        ) {
                            // console.log(`У участника ${memberIdStr} не соблюдены combo-требования. Удаляем.`);
                            await bot.banChatMember(chatIdNum, Number(memberIdStr));
                            await bot.unbanChatMember(chatIdNum, Number(memberIdStr));
                            await Chat.updateOne(
                                { _id: chat._id },
                                { $pull: { members: memberIdStr } }
                            );
                        }
                    } catch (err) {
                        console.error(`Ошибка при проверке участника ${memberIdStr} в чате ${chat.chatId}:`, err.message);

                        if (err.message.includes('USER_NOT_PARTICIPANT')) {
                            // console.log(`Участник ${memberIdStr} уже не состоит в чате. Удаляем из массива.`);
                            await Chat.updateOne(
                                { _id: chat._id },
                                { $pull: { members: memberIdStr } }
                            );
                        }
                    }
                    await delay(2000);
                }
                await delay(3500);
            }

            // console.log('Проверка всех combo-чатов завершена.\n');
        }, 18000000); // 18000000
    } catch (error) {
        console.error('Ошибка в handleComboChats:', error.message);
    }
}