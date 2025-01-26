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
                console.log('Некорректный запрос на присоединение к чату.');
                return;
            }

            const chatId = joinRequest.chat.id;
            const userId = joinRequest.from.id;

            const chatDoc = await Chat.findOne({ chatId });
            if (!chatDoc) {
                console.log(`Чат с chatId ${chatId} не найден.`);
                await bot.declineChatJoinRequest(chatId, userId);
                return;
            }

            const walletAddress = await getWalletAddressByUserId(userId);

            if (!walletAddress) {
                console.log(`Кошелек пользователя ${userId} не найден. Запрос отклонён.`);
                await bot.declineChatJoinRequest(chatId, userId);
                return;
            }

            console.log(`Пользователь ${userId}, кошелек: ${walletAddress}`);

            const userNfts = await getNftBalance(walletAddress, chatDoc.nft.collectionAddress);
            const userNftCount = userNfts.length;

            console.log(`Количество NFT пользователя ${userId}: ${userNftCount}, требуется: ${chatDoc.nft.nftRequirement}`);

            if (userNftCount >= chatDoc.nft.nftRequirement) {
                await bot.approveChatJoinRequest(chatId, userId);

                try {
                    await Chat.updateOne(
                        { chatId },
                        { $pull: { members: userId.toString() } }
                    );

                    const updateResult = await Chat.updateOne(
                        { chatId },
                        { $push: { members: userId.toString() } }
                    );

                    if (updateResult.modifiedCount > 0) {
                        console.log(`✅ Пользователь ${userId} добавлен в members чата ${chatId}.`);
                    } else {
                        console.error(`❌ Не удалось добавить пользователя ${userId} в members чата ${chatId}.`);
                    }
                } catch (error) {
                    console.error(`Ошибка при обновлении members для чата ${chatId}:`, error.message);
                }

                await bot.sendMessage(chatId, `🎉 Добро пожаловать, ${joinRequest.from.first_name}, в наш приватный чат!`);
            } else {
                console.log(`Пользователь ${userId} отклонён: количество NFT (${userNftCount}) меньше требуемого (${chatDoc.nft.nftRequirement}).`);
                await bot.declineChatJoinRequest(chatId, userId);
            }
        });

        setInterval(async () => {
            console.log('Запущена проверка всех NFT-чатов.');

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
                                { chatId },
                                { $pull: { members: memberId.toString() } }
                            );

                            if (updateResult.modifiedCount > 0) {
                                console.log(`Участник ${memberId} успешно удалён из members чата ${chatId}.`);
                            } else {
                                console.error(`❌ Не удалось удалить участника ${memberId} из members чата ${chatId}.`);
                            }
                            continue;
                        }

                        const userNfts = await getNftBalance(walletAddress, chat.nft.collectionAddress);
                        const userNftCount = userNfts.length;

                        console.log(`NFT участника ${memberId}: ${userNftCount}, требуется: ${chat.nft.nftRequirement}`);

                        if (userNftCount < chat.nft.nftRequirement) {
                            console.log(`У участника ${memberId} недостаточно NFT. Удаляем из чата.`);
                            await bot.banChatMember(chatId, memberId);
                            await bot.unbanChatMember(chatId, memberId);

                            const updateResult = await Chat.updateOne(
                                { chatId },
                                { $pull: { members: memberId.toString() } }
                            );

                            if (updateResult.modifiedCount > 0) {
                                console.log(`Участник ${memberId} успешно удалён из members чата ${chatId}.`);
                            } else {
                                console.error(`❌ Не удалось удалить участника ${memberId} из members чата ${chatId}.`);
                            }
                        }
                    } catch (error) {
                        console.error(`Ошибка при проверке участника ${memberId}:`, error.message);

                        if (error.message.includes('USER_NOT_PARTICIPANT')) {
                            console.log(`Участник ${memberId} не состоит в чате. Удаляем из базы.`);
                            await Chat.updateOne(
                                { chatId },
                                { $pull: { members: memberId.toString() } }
                            );
                        }
                    }
                    await delay(2750);
                }
                await delay(3750);
            }

            console.log('Проверка всех чатов завершена.');
        }, 28800000); 
    } catch (error) {
        console.error('Ошибка в handlePrivateNftChats:', error.message);
    }
}