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

        /**
         * LISTEN FOR CHAT JOIN REQUESTS
         */
        bot.on('chat_join_request', async (joinRequest) => {
            const userId = joinRequest?.from?.id;
            const chatId = joinRequest?.chat?.id;
            console.log(`Получен запрос от пользователя ${userId || 'неизвестный'} для чата ${chatId || 'неизвестный'}`);

            if (!joinRequest || !joinRequest.chat || !joinRequest.from) {
                console.log('Некорректный запрос на присоединение к чату.');
                return;
            }

            const chatDoc = await Chat.findOne({ chatId });
            if (!chatDoc) {
                console.log(`Чат с chatId ${chatId} не найден.`);
                // await bot.declineChatJoinRequest(chatId, userId);
                return;
            }

            // Get user's wallet address
            const walletAddress = await getWalletAddressByUserId(userId);
            if (!walletAddress) {
                console.log(`Кошелек пользователя ${userId} не найден. Запрос отклонён.`);
                // await bot.declineChatJoinRequest(chatId, userId);
                return;
            }

            console.log(`Пользователь ${userId}, кошелек: ${walletAddress}`);

            // Check user's NFT balance
            const userNfts = await getNftBalance(walletAddress, chatDoc.nft.collectionAddress);
            const userNftCount = userNfts.length;
            console.log(`Количество NFT пользователя ${userId}: ${userNftCount}, требуется: ${chatDoc.nft.nftRequirement}`);

            // Compare NFT count with the requirement
            if (userNftCount >= chatDoc.nft.nftRequirement) {
                try {
                    await bot.approveChatJoinRequest(chatId, userId);
                } catch (error) {
                    if (
                        error.response &&
                        error.response.body &&
                        error.response.body.description
                    ) {
                        const description = error.response.body.description;
                        if (description.includes('USER_ALREADY_PARTICIPANT')) {
                            console.log(`Пользователь ${userId} уже состоит в чате ${chatId}.`);
                        } else if (description.includes('HIDE_REQUESTER_MISSING')) {
                            console.log(
                                `Запрос на вступление для пользователя ${userId} больше не доступен (HIDE_REQUESTER_MISSING).`
                            );
                        } else {
                            console.error(
                                `Ошибка при одобрении запроса пользователя ${userId}:`,
                                error.message
                            );
                        }
                    } else {
                        console.error(
                            `Ошибка при одобрении запроса пользователя ${userId}:`,
                            error.message
                        );
                    }
                }

                // Update the members array in the database
                try {
                    // Remove user if already in array (just in case)
                    await Chat.updateOne({ chatId }, { $pull: { members: userId.toString() } });

                    // Add user to members
                    const updateResult = await Chat.updateOne(
                        { chatId },
                        { $push: { members: userId.toString() } }
                    );

                    if (updateResult.modifiedCount > 0) {
                        console.log(`✅ Пользователь ${userId} добавлен в members чата ${chatId}.`);
                    } else {
                        console.error(
                            `❌ Не удалось добавить пользователя ${userId} в members чата ${chatId}.`
                        );
                    }
                } catch (error) {
                    console.error(
                        `Ошибка при обновлении members для чата ${chatId}:`,
                        error.message
                    );
                }

                // Send welcome message
                await bot.sendMessage(
                    chatId,
                    `🎉 Добро пожаловать, ${joinRequest.from.first_name}, в наш приватный чат!`
                );
            } else {
                console.log(
                    `Пользователь ${userId} отклонён: количество NFT (${userNftCount}) меньше требуемого (${chatDoc.nft.nftRequirement}).`
                );
                // await bot.declineChatJoinRequest(chatId, userId);
            }
        });

        /**
         * PERIODIC CHECK OF MEMBERS IN ALL NFT CHATS
         */
        setInterval(async () => {
            console.log('Запущена проверка всех NFT-чатов.');

            for (const chat of privateNftChats) {
                const chatId = chat.chatId;
                console.log(`Проверяем чат ${chatId}`);

                if (!chat.nft || !chat.nft.collectionAddress) {
                    console.log(`Пропускаем чат ${chatId}: нет данных о коллекции NFT.`);
                    continue;
                }

                // Load current members from DB
                const currentChat = await Chat.findOne({ chatId }).select('members').lean();
                if (!currentChat || !currentChat.members.length) {
                    console.log(`Нет участников для проверки в чате ${chatId}.`);
                    continue;
                }

                // Check each member's NFT balance
                for (const memberId of currentChat.members) {
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
                                console.log(
                                    `Участник ${memberId} успешно удалён из members чата ${chatId}.`
                                );
                            } else {
                                console.error(
                                    `❌ Не удалось удалить участника ${memberId} из members чата ${chatId}.`
                                );
                            }
                            continue;
                        }

                        const userNfts = await getNftBalance(walletAddress, chat.nft.collectionAddress);
                        const userNftCount = userNfts.length;
                        console.log(
                            `NFT участника ${memberId}: ${userNftCount}, требуется: ${chat.nft.nftRequirement}`
                        );

                        if (userNftCount < chat.nft.nftRequirement) {
                            console.log(
                                `У участника ${memberId} недостаточно NFT. Удаляем из чата.`
                            );
                            await bot.banChatMember(chatId, memberId);
                            await bot.unbanChatMember(chatId, memberId);

                            const updateResult = await Chat.updateOne(
                                { chatId },
                                { $pull: { members: memberId.toString() } }
                            );

                            if (updateResult.modifiedCount > 0) {
                                console.log(
                                    `Участник ${memberId} успешно удалён из members чата ${chatId}.`
                                );
                            } else {
                                console.error(
                                    `❌ Не удалось удалить участника ${memberId} из members чата ${chatId}.`
                                );
                            }
                        }
                    } catch (error) {
                        console.error(`Ошибка при проверке участника ${memberId}:`, error.message);

                        // If the user is no longer in the chat
                        if (error.message.includes('USER_NOT_PARTICIPANT')) {
                            console.log(
                                `Участник ${memberId} не состоит в чате. Удаляем из базы.`
                            );
                            await Chat.updateOne(
                                { chatId },
                                { $pull: { members: memberId.toString() } }
                            );
                        }
                    }

                    // Prevent rate-limit issues by spacing out calls
                    await delay(2750);
                }

                // Slight delay between each chat’s checks
                await delay(3750);
            }

            console.log('Проверка всех чатов завершена.');
        }, 28800000); // Runs every 8 hours
    } catch (error) {
        console.error('Ошибка в handlePrivateNftChats:', error.message);
    }
}