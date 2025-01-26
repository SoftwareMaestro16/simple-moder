import Chat from '../models/Chat.js';
import getNftBalance from '../utils/getUserBalances/getNftBalance.js';
import { getWalletAddressByUserId } from '../db/userMethods.js';
import { getAllPrivateNftChats } from '../db/chatMethods.js';
import { delay } from '../utils/defay.js';

export async function handlePrivateNftChats(bot) {
    try {
        const privateNftChats = await getAllPrivateNftChats();

        if (!privateNftChats.length) {
            console.log('Нет приватных NFT-чатов для обработки.');
            return;
        }

        console.log(`Обнаружено приватных NFT-чатов: ${privateNftChats.length}`);

        bot.on('chat_join_request', async (joinRequest) => {
            console.log(`Получен запрос от пользователя ${joinRequest?.from?.id || 'неизвестный'} для чата ${joinRequest?.chat?.id || 'неизвестный'}`);
        
            if (!joinRequest || !joinRequest.chat || !joinRequest.from) {
                console.log('Пустой или некорректный запрос, пропускаем.');
                return;
            }
        
            const chatId = joinRequest.chat.id;
            const userId = joinRequest.from.id;
        
            const chatDoc = privateNftChats.find((c) => c.chatId === chatId.toString());
            if (!chatDoc) {
                console.log(`Чат ${chatId} не найден среди приватных NFT-чатов, запрос игнорируется.`);
                return;
            }
        
            const walletAddress = await getWalletAddressByUserId(userId);
        
            if (!walletAddress) {
                await bot.declineChatJoinRequest(chatId, userId);
                console.log(`Пользователь ${userId} отклонён: кошелёк не найден.`);
                return;
            }
        
            console.log(`Пользователь ${userId}, кошелёк: ${walletAddress}`);
        
            const userNfts = await getNftBalance(walletAddress, chatDoc.nft.collectionAddress);
            const userNftCount = userNfts.length;
        
            console.log(`Количество NFT пользователя ${userId}: ${userNftCount}, требуемое количество: ${chatDoc.nft.nftRequirement}`);
        
            if (userNftCount >= chatDoc.nft.nftRequirement) {
                await bot.approveChatJoinRequest(chatId, userId);

                const updateResult = await Chat.findOneAndUpdate(
                    { _id: chatDoc._id },
                    { $addToSet: { members: userId.toString() } },
                    { new: true } // Возвращает обновленный документ
                );
                console.log('Результат обновления members:', updateResult);

                if (updateResult.modifiedCount > 0) {
                    console.log(`Пользователь ${userId} успешно добавлен в members для чата ${chatId}.`);
                } else {
                    console.error(`Не удалось добавить пользователя ${userId} в members для чата ${chatId}.`);
                }
        
                await bot.sendMessage(
                    chatId,
                    `🎉 Добро пожаловать, ${joinRequest.from.first_name}, в наш приватный чат!`,
                );
            } else {
                await bot.declineChatJoinRequest(chatId, userId);
                console.log(`Пользователь ${userId} отклонён: количество NFT (${userNftCount}) меньше требуемого (${chatDoc.nft.nftRequirement}).`);
            }
        });

        setInterval(async () => {
            console.log('Запущена проверка всех чатов с NFT.');
        
            for (const chat of privateNftChats) {
                const chatId = chat.chatId;
        
                console.log(`Проверяем чат ${chatId}`);
        
                if (!chat.nft || !chat.nft.collectionAddress) {
                    console.log(`Пропускаем чат ${chatId}: нет данных о коллекции NFT.`);
                    continue;
                }
        
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
                            console.log(`У участника ${memberId} нет кошелька. Удаляем из чата.`);
                            await bot.banChatMember(chatId, memberId);
                            await bot.unbanChatMember(chatId, memberId);
                            const updateResult = await Chat.updateOne(
                                { _id: chat._id },
                                { $pull: { members: memberId } }
                            );

                            if (updateResult.modifiedCount > 0) {
                                console.log(`Участник ${memberId} успешно удалён из members для чата ${chatId}.`);
                            } else {
                                console.error(`Не удалось удалить участника ${memberId} из members для чата ${chatId}.`);
                            }
                            continue;
                        }
        
                        const userNfts = await getNftBalance(walletAddress, chat.nft.collectionAddress);
                        const userNftCount = userNfts.length;
        
                        console.log(`Количество NFT участника ${memberId}: ${userNftCount}, требуемое: ${chat.nft.nftRequirement}`);
        
                        if (userNftCount < chat.nft.nftRequirement) {
                            console.log(`У участника ${memberId} недостаточно NFT. Удаляем из чата.`);
                            await bot.banChatMember(chatId, memberId);
                            await bot.unbanChatMember(chatId, memberId);
                            const updateResult = await Chat.updateOne(
                                { _id: chat._id },
                                { $pull: { members: memberId } }
                            );

                            if (updateResult.modifiedCount > 0) {
                                console.log(`Участник ${memberId} успешно удалён из members для чата ${chatId}.`);
                            } else {
                                console.error(`Не удалось удалить участника ${memberId} из members для чата ${chatId}.`);
                            }
                        } else {
                            console.log(`У участника ${memberId} достаточно NFT (${userNftCount} >= ${chat.nft.nftRequirement}).`);
                        }
                    } catch (err) {
                        console.error(`Ошибка при проверке участника ${memberId} в чате ${chatId}:`, err.message);

                        if (err.message.includes('USER_NOT_PARTICIPANT')) {
                            console.log(`Участник ${memberId} уже не состоит в чате. Удаляем из базы.`);
                            const updateResult = await Chat.updateOne(
                                { _id: chat._id },
                                { $pull: { members: memberId } }
                            );

                            if (updateResult.modifiedCount > 0) {
                                console.log(`Участник ${memberId} успешно удалён из members в базе данных.`);
                            } else {
                                console.error(`Не удалось удалить участника ${memberId} из базы данных.`);
                            }
                        }
                    }
                    await delay(2750); 
                }
                await delay(3750); 
            }
        
            console.log('Проверка всех чатов завершена.');
        }, 28800000); // 8 часов
    } catch (error) {
        console.error('Ошибка в handlePrivateNftChats:', error.message);
    }
}