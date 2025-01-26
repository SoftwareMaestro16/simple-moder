import { addChatToDatabase } from "../../db/chatMethods.js";
import { generteReturnMainKeyboard } from "../../interactions/keyboard.js";

export async function finalizeSetup(bot, chatId) {
    const { chatInfo = {}, jetton = {}, nft = {}, typeOfChat = 'N/A' } = bot.context;

    if (typeOfChat === 'private') {
        try {
            const newInviteLinkObj = await bot.createChatInviteLink(chatInfo.id, {
                name: 'SimpleModer RequestLink',
                creates_join_request: true,
            });
            chatInfo.invite_link = newInviteLinkObj.invite_link;

            // console.log(`✅ Создана ссылка с заявкой на вступление для чат ${chatInfo.id}:\n`, chatInfo.invite_link);
        } catch (error) {
            console.error('❌ Не удалось создать ссылку с заявкой на вступление:', error.message);
        }
    } else {
        // console.log(`⚠️ Либо chatInfo.type !== 'supergroup', либо typeOfChat !== 'private'. Ссылка с заявкой не создаётся.`);
    }

    const resultMessage = generateResultMessage(chatInfo, jetton, nft, typeOfChat);
    const sentMessage = await bot.sendMessage(chatId, resultMessage, {
        parse_mode: 'HTML',
        reply_markup: generateFinalizeKeyboard(),
    });

    bot.context.lastMessageId = sentMessage.message_id;

    bot.on('callback_query', async (callbackQuery) => {
        const callbackData = callbackQuery.data;

        try {
            if (callbackData === 'AddChatToDB') {
                await handleAddChat(bot, chatId, callbackQuery);
            } else if (callbackData === 'Reject') {
                await handleRejectSetup(bot, chatId);
            }
        } catch (error) {
            console.error('Ошибка при обработке callback-запроса:', error.message);
            await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте снова.');
        }
    });
}

function generateResultMessage(chatInfo, jetton, nft, typeOfChat) {
    let message = `<b>Настройка завершена!</b>\n\n` +
        `<b>Чат:</b> ${chatInfo?.title || 'N/A'}\n` +
        `<b>ID:</b> ${chatInfo?.id || 'N/A'}\n` +
        `<b>Ссылка:</b> ${chatInfo?.invite_link || 'Отсутствует'}\n` +
        `<b>Тип чата:</b> ${typeOfChat}\n`

    if (Object.keys(jetton).length > 0) {
        message += `<b>Jetton:</b>\n` +
            `- Адрес: ${jetton.address || 'N/A'}\n` +
            `- Порог: ${jetton.amount || 'N/A'}\n\n`;
    }

    if (Object.keys(nft).length > 0) {
        message += `<b>NFT:</b>\n` +
            `- Адрес: ${nft.address || 'N/A'}\n` +
            `- Порог: ${nft.amount || 'N/A'}\n\n`;
    }

    message += `Для добавления чата нажмите кнопку ниже.`;

    return message;
}

function generateFinalizeKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '✅ Добавить', callback_data: 'AddChatToDB' },
                { text: 'Отменить ❌', callback_data: 'Reject' },
            ],
        ],
    };
}

async function handleAddChat(bot, chatId, callbackQuery) {
    try {
        if (bot.context.lastMessageId) {
            await bot.deleteMessage(chatId, bot.context.lastMessageId);
            bot.context.lastMessageId = null;
        }
        await addChatToDatabase(bot, callbackQuery);
    } catch (error) {
        console.error('Ошибка при добавлении чата в базу данных:', error.message);
    }
}

async function handleRejectSetup(bot, chatId) {
    try {
        if (bot.context.lastMessageId) {
            await bot.deleteMessage(chatId, bot.context.lastMessageId);
            bot.context.lastMessageId = null;
        }
        bot.context = {}; 

        const keyboard = await generteReturnMainKeyboard();
        await bot.sendMessage(chatId, '❌ Настройка чата отменена.', {
            reply_markup: keyboard
        });
    } catch (error) {
        console.error('Ошибка при отмене настройки:', error.message);
    }
}