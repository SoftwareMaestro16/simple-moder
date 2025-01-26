import { getAllPublicChats } from "../db/chatMethods.js";
import { getJettonDecimals } from "../db/jettonMethods.js";
import getJettonBalance from "../utils/getUserBalances/getJettonBalance.js";
import { getWalletAddressByUserId } from "../db/userMethods.js";

export async function handlePublicChats(bot) {
    try {
        const publicChats = await getAllPublicChats();

        if (!publicChats.length) {
            // console.log('Нет публичных чатов для обработки.');
            return;
        }

        console.log(`Обнаружено публичных чатов: ${publicChats.length}`);

        bot.on('message', async (msg) => {
            const chatId = msg.chat.id;

            if (msg.chat.type === 'private') {
                return;
            }

            if (
                msg.new_chat_members ||
                msg.left_chat_member ||
                msg.pinned_message 
            ) {
                // console.log(`Системное сообщение в чате ${chatId} пропущено.`);
                return;
            }

            if (msg.sender_chat) {
                // console.log(`Сообщение от канала (ID: ${msg.sender_chat.id}) пропущено.`);
                return;
            }

            const chat = publicChats.find((c) => c.chatId === chatId.toString());
            if (!chat || !chat.jetton || !chat.jetton.jettonAddress) {
                return;
            }

            const userId = msg.from.id;

            const isAdmin = await bot
                .getChatMember(chatId, userId)
                .then((member) => ['administrator', 'creator'].includes(member.status))
                .catch(() => false);

            if (isAdmin) {
                return;
            }

            try {
                const walletAddress = await getWalletAddressByUserId(userId);
                let userBalance = 0;

                if (walletAddress) {
                    const decimals = await getJettonDecimals(chat.jetton.jettonAddress);
                    userBalance = await getJettonBalance(
                        walletAddress,
                        chat.jetton.jettonAddress,
                        decimals
                    );

                    if (userBalance < chat.jetton.jettonRequirement) {
                        await muteUser(bot, chatId, userId, msg.message_id, chat.jetton);
                    }
                } else {
                    await muteUser(bot, chatId, userId, msg.message_id, chat.jetton, true);
                }
            } catch (error) {
                console.error(`Ошибка при проверке пользователя ${userId} в чате ${chatId}:`, error.message);
            }
        });
    } catch (error) {
        console.error('Ошибка в handlePublicChats:', error.message);
    }
}

async function muteUser(bot, chatId, userId, messageId, jetton, noWallet = false) {
    try {
        await bot.deleteMessage(chatId, messageId);
    } catch (deleteError) {
        console.warn(`Не удалось удалить сообщение пользователя ${userId}: ${deleteError.message}`);
    }

    const muteUntil = Math.floor(Date.now() / 1000) + 60;
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
            // console.log(`Сообщение бота в чате ${chatId} удалено через 12 секунд.`);
        } catch (deleteError) {
            console.warn(`Не удалось удалить сообщение бота в чате ${chatId}: ${deleteError.message}`);
        }
    }, 12000);
}