import { generateJettonListForSelectKeyboard, generateJettonListKeyboard, generateNFTListForSelectKeyboard, generateNFTListKeyboard } from "../../interactions/keyboard.js";
import { getAllJettonAddressesAndSymbols, getAllJettonSymbols } from "../../db/jettonMethods.js";
import { getAllCollectionsWithAddresses, getAllNamesCollection } from "../../db/nftMethods.js";

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