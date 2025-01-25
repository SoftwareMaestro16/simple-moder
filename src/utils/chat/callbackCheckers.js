import { generateJettonListForSelectKeyboard, generateNFTListForSelectKeyboard } from "../../interactions/keyboard.js";
import { getAllJettonAddressesAndSymbols } from "../../db/jettonMethods.js";
import { getAllCollectionsWithAddresses } from "../../db/nftMethods.js";

export async function handleJettonPagination(bot, callbackData, chatId, messageId) {
    const currentPage = parseInt(callbackData.split('_')[1], 10);
    const jettons = await getAllJettonAddressesAndSymbols();
    const keyboard = generateJettonListForSelectKeyboard(jettons, currentPage);

    await bot.editMessageReplyMarkup(
        { inline_keyboard: keyboard.inline_keyboard },
        { chat_id: chatId, message_id: messageId }
    );
}

export async function handleNFTPagination(bot, callbackData, chatId, messageId) {
    const currentPage = parseInt(callbackData.split('_')[1], 10);
    const collections = await getAllCollectionsWithAddresses();
    const keyboard = generateNFTListForSelectKeyboard(collections, currentPage);

    await bot.editMessageReplyMarkup(
        { inline_keyboard: keyboard.inline_keyboard },
        { chat_id: chatId, message_id: messageId }
    );
}