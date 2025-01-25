import { generateJettonListForSelectKeyboard, generateJettonListKeyboard, generateNFTListForSelectKeyboard, generateNFTListKeyboard, generateUserChatsKeyboard } from "../../interactions/keyboard.js";
import { getAllJettonAddressesAndSymbols, getAllJettonSymbols } from "../../db/jettonMethods.js";
import { getAllCollectionsWithAddresses, getAllNamesCollection } from "../../db/nftMethods.js";
import Chat from "../../models/Chat.js";

export async function handleJettonPagination(bot, callbackData, chatId, messageId) {
    const parts = callbackData.split('_');
    const page = parseInt(parts[2], 10);  

    const allSymbols = await getAllJettonSymbols(); 

    const keyboard = generateJettonListKeyboard(allSymbols, page);

    await bot.editMessageReplyMarkup(
        { inline_keyboard: keyboard.inline_keyboard },
        { chat_id: chatId, message_id: messageId }
    );
}

export async function handleJettonSelectPagination(bot, callbackData, chatId, messageId) {
    const parts = callbackData.split('_');
    const page = parseInt(parts[1], 10);  

    const allJettons = await getAllJettonAddressesAndSymbols();

    const keyboard = generateJettonListForSelectKeyboard(allJettons, page);

    await bot.editMessageReplyMarkup(
        { inline_keyboard: keyboard.inline_keyboard },
        { chat_id: chatId, message_id: messageId }
    );
}

export async function handleNFTPagination(bot, callbackData, chatId, messageId) {
    const parts = callbackData.split('_');
    const currentPage = parseInt(parts[2], 10);

    const allNames = await getAllNamesCollection(); 
 
    const keyboard = generateNFTListKeyboard(allNames, currentPage);

    await bot.editMessageReplyMarkup(
        { inline_keyboard: keyboard.inline_keyboard },
        { chat_id: chatId, message_id: messageId }
    );
}

export async function handleNFTSelectPagination(bot, callbackData, chatId, messageId) {
    const parts = callbackData.split('_');
    const currentPage = parseInt(parts[1], 10);

    const allCollections = await getAllCollectionsWithAddresses();

    const keyboard = generateNFTListForSelectKeyboard(allCollections, currentPage);

    await bot.editMessageReplyMarkup(
        { inline_keyboard: keyboard.inline_keyboard },
        { chat_id: chatId, message_id: messageId }
    );
}

export async function handleUserChatsPagination(bot, callbackData, chatId, messageId) {
    const parts = callbackData.split('_');
    const currentPage = parseInt(parts[2], 10);

    try {
        const userChats = await Chat.find({ adminId: chatId });

        if (!userChats.length) {
            await bot.editMessageText(
                '❌ У вас пока нет созданных чатов.',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: {
                        inline_keyboard: [[{ text: '« Назад', callback_data: 'Menu' }]],
                    },
                }
            );
            return;
        }

        const keyboard = generateUserChatsKeyboard(userChats, currentPage);

        await bot.editMessageReplyMarkup(
            {
                inline_keyboard: keyboard.inline_keyboard,
            },
            {
                chat_id: chatId,
                message_id: messageId,
            }
        );
    } catch (error) {
        console.error('Ошибка в handleUserChatsPagination:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.');
    }
}