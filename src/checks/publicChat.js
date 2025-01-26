import { getAllPublicChats } from "../db/chatMethods.js";
import { getJettonDecimals } from "../db/jettonMethods.js";
import getJettonBalance from "../utils/getUserBalances/getJettonBalance.js";
import { getWalletAddressByUserId } from "../db/userMethods.js";

export async function handlePublicChats(bot) {
    try {
        const publicChats = await getAllPublicChats();

        if (!publicChats.length) {
            console.log('Нет публичных чатов для обработки.');
            return;
        }

        console.log(`Обнаружено публичных чатов: ${publicChats.length}`);

        bot.on('message', async (msg) => {
            try {
                console.log(`Получено сообщение в чате ${msg.chat.id} от пользователя ${msg.from.id}`);
                const chatId = msg.chat.id;

                if (msg.chat.type === 'private') {
                    console.log('Пропущено сообщение из личного чата.');
                    return;
                }

                if (msg.new_chat_members || msg.left_chat_member || msg.pinned_message) {
                    console.log(`Системное сообщение в чате ${chatId} пропущено.`);
                    return;
                }

                if (msg.sender_chat) {
                    console.log(`Сообщение от канала (ID: ${msg.sender_chat.id}) пропущено.`);
                    return;
                }

                const chat = publicChats.find((c) => c.chatId === chatId.toString());
                if (!chat || !chat.jetton || !chat.jetton.jettonAddress) {
                    console.log(`Чат ${chatId} не найден в списке публичных чатов или не настроен для проверки Jetton.`);
                    return;
                }

                const userId = msg.from.id;

                const isAdmin = await bot
                    .getChatMember(chatId, userId)
                    .then((member) => ['administrator', 'creator'].includes(member.status))
                    .catch(() => false);

                if (isAdmin) {
                    console.log(`Пользователь ${userId} является администратором в чате ${chatId}, проверка пропущена.`);
                    return;
                }

                try {
                    const walletAddress = await getWalletAddressByUserId(userId);
                    let userBalance = 0;

                    if (walletAddress) {
                        console.log(`Кошелек пользователя ${userId}: ${walletAddress}`);
                        const decimals = await getJettonDecimals(chat.jetton.jettonAddress);
                        userBalance = await getJettonBalance(
                            walletAddress,
                            chat.jetton.jettonAddress,
                            decimals
                        );
                        console.log(`Баланс пользователя ${userId} для Jetton ${chat.jetton.symbol}: ${userBalance}`);

                        if (userBalance < chat.jetton.jettonRequirement) {
                            console.log(`Недостаточный баланс у пользователя ${userId} в чате ${chatId}.`);
                            await muteUser(bot, chatId, userId, msg.message_id, chat.jetton);
                        }
                    } else {
                        console.log(`Кошелек пользователя ${userId} не найден.`);
                        await muteUser(bot, chatId, userId, msg.message_id, chat.jetton, true);
                    }
                } catch (error) {
                    console.error(`Ошибка при проверке пользователя ${userId} в чате ${chatId}:`, error.message);
                }
            } catch (msgError) {
                console.error('Ошибка обработки сообщения:', msgError.message);
            }
        });

        console.log('Обработчик сообщений для публичных чатов зарегистрирован.');
    } catch (error) {
        console.error('Ошибка в handlePublicChats:', error.message);
    }
}

async function muteUser(bot, chatId, userId, messageId, jetton, noWallet = false) {
    try {
        console.log(`Попытка удалить сообщение пользователя ${userId} в чате ${chatId}.`);
        await bot.deleteMessage(chatId, messageId);
    } catch (deleteError) {
        console.warn(`Не удалось удалить сообщение пользователя ${userId}: ${deleteError.message}`);
    }

    const muteUntil = Math.floor(Date.now() / 1000) + 60;
    console.log(`Ограничение отправки сообщений для пользователя ${userId} в чате ${chatId} на 60 секунд.`);
    await bot.restrictChatMember(chatId, userId, {
        can_send_messages: false,
        until_date: muteUntil,
    });

    const warningMessage = noWallet
        ? `
⚠️ Чтобы писать в этом чате, вам необходимо подключить кошелек и иметь на балансе: <b>${jetton.jettonRequirement} $${jetton.symbol}</b>
        `
        : `
⚠️ Чтобы писать в этом чате, вам необходимо иметь на балансе: <b>${jetton.jettonRequirement} $${jetton.symbol}</b>
        `;

    const botMessage = await bot.sendMessage(chatId, warningMessage, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '🤖 Перейти в Бота 💸',
                        url: 'https://t.me/simple_moder_bot',
                    },
                ],
            ],
        },
    });

    setTimeout(async () => {
        try {
            await bot.deleteMessage(chatId, botMessage.message_id);
            console.log(`Сообщение бота в чате ${chatId} удалено через 12 секунд.`);
        } catch (deleteError) {
            console.warn(`Не удалось удалить сообщение бота в чате ${chatId}: ${deleteError.message}`);
        }
    }, 12000);
}