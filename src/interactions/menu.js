import { 
    handleWalletConnection, 
    handleProfile, 
    handleDisconnectWallet, 
    handleDefaultMenu,
    handleJettonList,
    handleCollectionsList,
    handleTokensListing,
} from "./handlers.js";

export function registerCallbackQueries(bot) {
    bot.on('callback_query', async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const callbackData = callbackQuery.data;
        const messageId = callbackQuery.message.message_id;

        if (['Tonkeeper', 'MyTonWallet', 'TonHub'].includes(callbackData)) {
            await handleWalletConnection(bot, chatId, callbackData, messageId);
        }
        else if (callbackData == 'Profile') {
            await handleProfile(bot, chatId, messageId);
        }
        else if (callbackData == 'Disconnect') {
            await handleDisconnectWallet(bot, chatId, messageId);
        }
        else if (callbackData == 'Menu') {
            await handleDefaultMenu(bot, chatId, messageId);
        }
        else if (callbackData == 'JettonList') {
            await handleJettonList(bot, chatId, messageId);
        }
        else if (callbackData == 'NFTList') {
            await handleCollectionsList(bot, chatId, messageId);
        }
        else if (callbackData == 'TokenListing') {
            await handleTokensListing(bot, chatId, messageId);
        }
    });
}