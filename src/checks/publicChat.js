import { getAllPublicChats } from "../db/chatMethods.js";
import { getUserById } from "../db/userMethods.js";
import { getJettonData } from "../utils/getTokensData/getJettonData.js";
import getJettonBalance from "../utils/getUserBalances/getJettonBalance.js";
import { delay } from "../utils/defay.js";

export async function handlePublicChats(bot) {
    try {
        const publicChats = await getAllPublicChats();

        const publicChatIds = publicChats.map(chat => String(chat.chatId));
        console.log(`Загружено ${publicChatIds.length} публичных чатов.`);

        bot.on('message', async (msg) => {
            const chatId = String(msg.chat.id);
            const userId = msg.from.id;
            const telegramChatType = msg.chat.type;

            if (telegramChatType === 'private') return;

            if (!publicChatIds.includes(chatId)) {
                console.log(`Чат ${chatId} не найден в списке публичных чатов.`);
                return;
            }

            const currentChat = publicChats.find(c => String(c.chatId) === chatId);
            if (!currentChat || !currentChat.jetton) return;

            const { jettonAddress, symbol, jettonRequirement } = currentChat.jetton;
            if (!jettonAddress || !jettonRequirement) return;

            try {
                const user = await getUserById(userId);
                const walletAddress = user?.walletAddress;

                if (!walletAddress) {
                    console.log(`Пользователь ${userId} не подключил кошелек. Удаляю сообщение и мутим.`);
                    await bot.deleteMessage(chatId, msg.message_id).catch(err => console.error('Ошибка при удалении сообщения:', err.message));

                    const muteUntilDate = Math.floor(Date.now() / 1000) + 60; 
                    await bot.restrictChatMember(chatId, userId, {
                        until_date: muteUntilDate,  
                        can_send_messages: false,  
                    });
                    console.log(`Пользователь ${userId} был замучен на 1 минуту в чате ${chatId}`);

                    const warningMessage = `
⚠️ Чтобы писать в этом чате, вам необходимо подключить кошелек и иметь на балансе: <b>${jettonRequirement} $${symbol}</b>
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

                    setTimeout(() => {
                        bot.deleteMessage(chatId, botMessage.message_id).catch(err => console.error('Ошибка при удалении предупреждения:', err.message));
                    }, 12000);

                    return;
                }

                await delay(5050); 
                const { decimals } = await getJettonData(jettonAddress);
                await delay(5050); 
                const balance = await getJettonBalance(walletAddress, jettonAddress, decimals);

                if (balance < jettonRequirement) {
                    console.log(`Пользователь ${userId} не соответствует требованиям по балансу. Удаляю сообщение и мутим.`);
                    await bot.deleteMessage(chatId, msg.message_id).catch(err => console.error('Ошибка при удалении сообщения:', err.message));

               
                    const muteUntilDate = Math.floor(Date.now() / 1000) + 60; 
                    await bot.restrictChatMember(chatId, userId, {
                        until_date: muteUntilDate, 
                        can_send_messages: false, 
                    });
                    console.log(`Пользователь ${userId} был замучен на 1 минуту в чате ${chatId}`);

                    const warningMessage = `
⚠️ Чтобы писать в этом чате, вам необходимо иметь на балансе: <b>${jettonRequirement} $${symbol}</b>)
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

                    setTimeout(() => {
                        bot.deleteMessage(chatId, botMessage.message_id).catch(err => console.error('Ошибка при удалении предупреждения:', err.message));
                    }, 12000);
                }

                await delay(3750);

            } catch (error) {
                console.error('Ошибка при проверке баланса Jetton:', error.message);
            }
        });

    } catch (error) {
        console.error('Ошибка при обработке публичных чатов:', error.message);
    }
}