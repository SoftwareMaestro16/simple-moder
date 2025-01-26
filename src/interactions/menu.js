import { 
    handleWalletConnection, 
    handleProfile, 
    handleDisconnectWallet, 
    handleDefaultMenu,
    handleJettonList,
    handleCollectionsList,
    handleTokensListing,
    handleCreateChat,
    handlePrivateChatSetup,
    handlePublicChatSetup,
    handleUserChats,
    handlePrivateChatsList,
    handleChatRequirements,
    handleUserChatDelete,
    handleUserChatInfo
} from "./handlers.js";
import {
    handleSelectJetton,
    handleSelectNFT,
    handleSelectJettonNFT,
    handleJettonSelection,
    handleNFTSelection,
} from '../utils/chat/callbackHelpers.js';
import {
    handleJettonPagination,
    handleJettonSelectPagination,
    handleNFTPagination,
    handleNFTSelectPagination,
    handlePrivateChatsListPagination,
    handleUserChatsPagination,
} from '../utils/chat/callbackCheckers.js';

export function registerCallbackQueries(bot) {
    bot.on('callback_query', async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const callbackData = callbackQuery.data;
        const messageId = callbackQuery.message.message_id;

        try {
            if (callbackData.startsWith('jtn_page_')) {
                await handleJettonPagination(bot, callbackData, chatId, messageId);
                return;
            }

            if (callbackData.startsWith('jtnsp_')) {
                await handleJettonSelectPagination(bot, callbackData, chatId, messageId);
                return;
            }

            if (callbackData.startsWith('nft_page_')) {
                await handleNFTPagination(bot, callbackData, chatId, messageId);
                return;
            }

            if (callbackData.startsWith('nftsp_')) {
                await handleNFTSelectPagination(bot, callbackData, chatId, messageId);
                return;
            }

            if (callbackData.startsWith('chats_page_')) {
                await handleUserChatsPagination(bot, callbackData, chatId, messageId);
                return;
            }

            if (callbackData.startsWith('private_page_')) {
                await handlePrivateChatsListPagination(bot, callbackData, chatId, messageId);
                return;
            }

            if (callbackData.startsWith('chat_requirements_')) {
                await handleChatRequirements(bot, callbackData, chatId, messageId);
                return;
            }

            if (callbackData.startsWith('mychat_info_')) {
                await handleUserChatInfo(bot, callbackData, chatId, messageId);
                return;
            }

            if (callbackData.startsWith('mychat_delete_')) {
                await handleUserChatDelete(bot, callbackData, chatId, messageId);
                return;
            }

            // console.log('Unhandled callback_query:', callbackData);
        } catch (error) {
            console.error('Ошибка обработки callback_query:', error.message);
        }

        try {
            if (callbackData === 'SelectJetton') {
                await handleSelectJetton(bot, chatId, messageId);
            } else if (callbackData === 'SelectNFT') {
                await handleSelectNFT(bot, chatId, messageId);
            } else if (callbackData === 'SelectJettonNFT') {
                await handleSelectJettonNFT(bot, chatId, messageId);
            } else if (callbackData.startsWith('jetton_')) {
                await handleJettonSelection(bot, chatId, messageId, callbackData);
            } else if (callbackData.startsWith('nft_')) {
                await handleNFTSelection(bot, chatId, messageId, callbackData);
            } else {
                // console.log('Unhandled callback_query:', callbackData);
            }
        } catch (error) {
            console.error('Ошибка обработки callback_query:', error.message);
        }

        if (['Tonkeeper', 'MyTonWallet', 'TonHub'].includes(callbackData)) {
            await handleWalletConnection(bot, chatId, callbackData, messageId);
        } else if (callbackData === 'Profile') {
            await handleProfile(bot, chatId, messageId);
        } else if (callbackData === 'Disconnect') {
            await handleDisconnectWallet(bot, chatId, messageId);
        } else if (callbackData === 'Menu') {
            await handleDefaultMenu(bot, chatId, messageId);
        } else if (callbackData === 'JettonList') {
            await handleJettonList(bot, chatId, messageId);
        } else if (callbackData === 'NFTList') {
            await handleCollectionsList(bot, chatId, messageId);
        } else if (callbackData === 'TokenListing') {
            await handleTokensListing(bot, chatId, messageId);
        } else if (callbackData === 'AddChat') {
            await handleCreateChat(bot, chatId, messageId);
        } else if (callbackData === 'PrivateChat') {
            await handlePrivateChatSetup(bot, chatId, messageId);
        } else if (callbackData === 'PublicChat') {
            await handlePublicChatSetup(bot, chatId, messageId);
        } else if (callbackData === 'MyChats') {
            await handleUserChats(bot, chatId, messageId);
        } else if (callbackData === 'EnterInChat') {
            await handlePrivateChatsList(bot, chatId, messageId);
        }
    });
}

