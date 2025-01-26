import { Address } from '@ton/core';
import { finalizeSetup } from './chatSetupUtils.js';
import { generateJettonListForSelectKeyboard, generateNFTListForSelectKeyboard } from '../../interactions/keyboard.js'
import { getAllJettonAddressesAndSymbols } from '../../db/jettonMethods.js';
import { getAllCollectionsWithAddresses } from '../../db/nftMethods.js';

export async function handleSelectJetton(bot, chatId, messageId) {
    const jettons = await getAllJettonAddressesAndSymbols();
    const newMessage = await bot.editMessageText('Выберите жетон:', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: generateJettonListForSelectKeyboard(jettons),
    });
    bot.context = { ...bot.context, lastMessageId: newMessage.message_id };
}

export async function handleSelectNFT(bot, chatId, messageId) {
    const collections = await getAllCollectionsWithAddresses();
    const newMessage = await bot.editMessageText('Выберите коллекцию NFT:', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: generateNFTListForSelectKeyboard(collections),
    });
    bot.context = { ...bot.context, lastMessageId: newMessage.message_id };
}

export async function handleSelectJettonNFT(bot, chatId, messageId) {
    const jettons = await getAllJettonAddressesAndSymbols();
    const newMessage = await bot.editMessageText('Сначала выберите жетон:', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: generateJettonListForSelectKeyboard(jettons),
    });
    bot.context = { ...bot.context, expectNFT: true, lastMessageId: newMessage.message_id };
}

export async function handleJettonSelection(bot, chatId, messageId, callbackData) {
    if (typeof callbackData !== 'string' || !callbackData.startsWith('jetton_')) {
        console.error('Invalid callbackData:', callbackData);
        await bot.sendMessage(chatId, '❌ Произошла ошибка: неверный формат данных.');
        return;
    }

    const jettonAddress = Address.parse(callbackData.replace('jetton_', '')).toRawString();
    bot.context.jetton = { address: jettonAddress };

    let newMessage;
    try {
        newMessage = await bot.editMessageText(
            'Введите минимальное количество выбранного Jetton:',
            {
                chat_id: chatId,
                message_id: messageId,
            }
        );
        bot.context.lastMessageId = newMessage.message_id;
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error.message);
        if (error.response?.error_code === 400) {
            await bot.sendMessage(chatId, '❌ Произошла ошибка: чат не найден.');
        }
        return; 
    }

    bot.once('message', async (message) => {
        const amount = parseFloat(message.text);
        if (isNaN(amount)) {
            await bot.sendMessage(
                chatId,
                '❌ Некорректное количество. Попробуйте снова.'
            );
            return;
        }

        bot.context.jetton.amount = amount;

        if (bot.context.expectNFT) {
            const collections = await getAllCollectionsWithAddresses();
            const nftMessage = await bot.sendMessage(
                chatId,
                'Теперь выберите коллекцию NFT:',
                {
                    reply_markup: generateNFTListForSelectKeyboard(collections),
                }
            );
            bot.context.lastMessageId = nftMessage.message_id;
        } else {
            await finalizeSetup(bot, chatId);
        }
    });
}

export async function handleNFTSelection(bot, chatId, messageId, callbackData) {
    const collectionAddress = Address.parse(callbackData.replace('nft_', '')).toRawString();
    bot.context.nft = { address: collectionAddress };

    const newMessage = await bot.editMessageText('Укажите порог количества NFT для доступа в чат:', {
        chat_id: chatId,
        message_id: bot.context.lastMessageId || messageId,
    });

    bot.context.lastMessageId = newMessage.message_id;
    bot.once('message', async (message) => {
        const amount = parseFloat(message.text);
        if (isNaN(amount)) {
            await bot.sendMessage(chatId, '❌ Некорректное количество. Попробуйте снова.');
            return;
        }
        bot.context.nft.amount = amount;
        await finalizeSetup(bot, chatId);
    });
}