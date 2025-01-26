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

        // Обработка запросов на присоединение
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
                return;
            }

            // Проверка наличия адреса коллекции
            if (!chatDoc.nft.collectionAddress) {
                console.log(`Адрес коллекции NFT для чата ${chatId} не задан. Запрос отклонён.`);
                await bot.declineChatJoinRequest(chatId, userId);
                return;
            }

            // Получение адреса кошелька пользователя
            const walletAddress = await getWalletAddressByUserId(userId);
            if (!walletAddress) {
                console.log(`Кошелек пользователя ${userId} не найден. Запрос отклонён.`);
                await bot.declineChatJoinRequest(chatId, userId);
                return;
            }

            console.log(`Пользователь ${userId}, кошелек: ${walletAddress}`);

            // Проверка баланса NFT пользователя
            try {
                const userNfts = await getNftBalance(walletAddress, chatDoc.nft.collectionAddress);
                const userNftCount = userNfts.length;
                console.log(`Количество NFT пользователя ${userId}: ${userNftCount}, требуется: ${chatDoc.nft.nftRequirement}`);

                if (userNftCount >= chatDoc.nft.nftRequirement) {
                    // Пользователь соответствует требованиям
                    await bot.approveChatJoinRequest(chatId, userId);

                    // Обновление участников в базе данных
                    await Chat.updateOne({ chatId }, { $pull: { members: userId.toString() } });
                    const updateResult = await Chat.updateOne(
                        { chatId },
                        { $push: { members: userId.toString() } }
                    );

                    if (updateResult.modifiedCount > 0) {
                        console.log(`✅ Пользователь ${userId} добавлен в members чата ${chatId}.`);
                    } else {
                        console.error(`❌ Не удалось добавить пользователя ${userId} в members чата ${chatId}.`);
                    }

                    // Отправка приветственного сообщения
                    await bot.sendMessage(
                        chatId,
                        `🎉 Добро пожаловать, ${joinRequest.from.first_name || 'новый участник'}, в наш приватный чат!`
                    );
                } else {
                    // Пользователь не соответствует требованиям
                    console.log(`Пользователь ${userId} отклонён: количество NFT (${userNftCount}) меньше требуемого (${chatDoc.nft.nftRequirement}).`);
                    await bot.declineChatJoinRequest(chatId, userId);
                }
            } catch (error) {
                console.error(`Ошибка при проверке баланса NFT пользователя ${userId}: ${error.message}`);
                await bot.declineChatJoinRequest(chatId, userId);
            }
        });

        // Периодическая проверка участников
        setInterval(async () => {
            console.log('Запущена проверка всех NFT-чатов.');

            for (const chat of privateNftChats) {
                const chatId = chat.chatId;
                console.log(`Проверяем чат ${chatId}`);

                if (!chat.nft || !chat.nft.collectionAddress) {
                    console.log(`Пропускаем чат ${chatId}: нет данных о коллекции NFT.`);
                    continue;
                }

                const currentChat = await Chat.findOne({ chatId }).select('members').lean();
                if (!currentChat || !currentChat.members.length) {
                    console.log(`Нет участников для проверки в чате ${chatId}.`);
                    continue;
                }

                for (const memberId of currentChat.members) {
                    console.log(`Проверяем участника ${memberId} в чате ${chatId}`);

                    try {
                        const walletAddress = await getWalletAddressByUserId(memberId);
                        if (!walletAddress) {
                            console.log(`У участника ${memberId} нет кошелька. Удаляем из чата.`);
                            await bot.banChatMember(chatId, memberId);
                            await bot.unbanChatMember(chatId, memberId);
                            await Chat.updateOne({ chatId }, { $pull: { members: memberId.toString() } });
                            continue;
                        }

                        const userNfts = await getNftBalance(walletAddress, chat.nft.collectionAddress);
                        const userNftCount = userNfts.length;

                        if (userNftCount < chat.nft.nftRequirement) {
                            console.log(`У участника ${memberId} недостаточно NFT. Удаляем из чата.`);
                            await bot.banChatMember(chatId, memberId);
                            await bot.unbanChatMember(chatId, memberId);
                            await Chat.updateOne({ chatId }, { $pull: { members: memberId.toString() } });
                        }
                    } catch (error) {
                        console.error(`Ошибка при проверке участника ${memberId}: ${error.message}`);
                        if (error.message.includes('USER_NOT_PARTICIPANT')) {
                            console.log(`Участник ${memberId} не состоит в чате. Удаляем из базы.`);
                            await Chat.updateOne({ chatId }, { $pull: { members: memberId.toString() } });
                        }
                    }

                    await delay(2750);
                }

                await delay(3750);
            }

            console.log('Проверка всех чатов завершена.');
        }, 28800000); // Проверка каждые 8 часов
    } catch (error) {
        console.error('Ошибка в handlePrivateNftChats:', error.message);
    }
}