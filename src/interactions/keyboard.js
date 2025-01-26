import { toUserFriendlyAddress } from "@tonconnect/sdk";

export function generateMainKeyboard(address) {
    return address
        ? [
            [
              { text: '👤 Профиль 💼', callback_data: 'Profile' },
            ],
            [
              { text: '🛠 Добавить Чат', callback_data: 'AddChat' },
              { text: 'Мои Чаты 🧩', callback_data: 'MyChats' },
            ],
            [
              { text: '🚪 Вступить в Чат 💬', callback_data: 'EnterInChat' },
            ],
            [
                { text: '📰 Листинг Токена 📄', callback_data: 'TokenListing' },
            ],
            [
                { text: '🪙 Jetton', callback_data: 'JettonList' },
                { text: 'NFT 🖼 ', callback_data: 'NFTList' },
            ],
            
          ]
        : [
            [
              { text: 'Tonkeeper', callback_data: 'Tonkeeper' },
              { text: 'MyTonWallet', callback_data: 'MyTonWallet' },
              { text: 'TonHub', callback_data: 'TonHub' },
            ],
          ];
}

export function generateWalletsKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: 'Tonkeeper', callback_data: 'Tonkeeper' },
                { text: 'MyTonWallet', callback_data: 'MyTonWallet' },
                { text: 'TonHub', callback_data: 'TonHub' },
            ],
        ],
    };
}

export async function generteCreateChatKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '🌍 Публичный', callback_data: 'PublicChat' },
                { text: 'Приватный 🔓', callback_data: 'PrivateChat' },
            ],
            [
                { text: '« Назад', callback_data: 'Menu' }
            ],
        ],
    };
}

export async function generteReturnMainKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '📋 Меню', callback_data: 'Menu' }
            ],
        ],
    };
}

export function generateProfileKeyboard(address) {
    return {
      inline_keyboard: address === 'Не Подключен'
        ? [
            [
              { text: 'Tonkeeper', callback_data: 'Tonkeeper' },
              { text: 'MyTonWallet', callback_data: 'MyTonWallet' },
              { text: 'TonHub', callback_data: 'TonHub' },
            ],
          ]
        : [
            [
              { text: 'Отключить Кошелек 💥', callback_data: 'Disconnect' },
            ],
            [
              { text: '« Назад', callback_data: 'Menu' },
            ],
          ],
    };
}

export function generateSubscriptionKeyboard(coreMedia) {
    return {
        inline_keyboard: [
            [
                { text: '📢 Канал', url: coreMedia.coreChannel.link },
                { text: 'Чат 💬 ', url: coreMedia.coreChat.link },
            ],
            [
                { text: '☑️ Проверить 🔄', callback_data: 'CheckSubscription' },
            ],
        ],
    };
}

export function generateJettonListKeyboard(symbols, currentPage = 1) {
    const itemsPerPage = 9; 
    const totalPages = Math.ceil(symbols.length / itemsPerPage); 
    const offset = (currentPage - 1) * itemsPerPage; 
    const currentSymbols = symbols.slice(offset, offset + itemsPerPage); 

    const keyboard = [];
    const rowSize = 3;

    for (let i = 0; i < currentSymbols.length; i += rowSize) {
        const row = currentSymbols.slice(i, i + rowSize).map(symbol => ({
            text: symbol,
            callback_data: `jtn_${symbol}`,
        }));
        keyboard.push(row);
    }

    const navigationRow = [];
    if (currentPage > 1) {
        navigationRow.push({ text: '⬅️', callback_data: `jtn_page_${currentPage - 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' }); 
    }

    navigationRow.push({ text: `· ${currentPage} / ${totalPages} ·`, callback_data: 'noop' });

    if (currentPage < totalPages) {
        navigationRow.push({ text: '➡️', callback_data: `jtn_page_${currentPage + 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' }); 
    }

    keyboard.push(navigationRow);

    keyboard.push([{ text: '« Назад', callback_data: 'Menu' }]);

    return {
        inline_keyboard: keyboard,
    };
}

export function generateJettonListForSelectKeyboard(jettons, currentPage = 1) {
    const itemsPerPage = 9; 
    const totalPages = Math.ceil(jettons.length / itemsPerPage); 
    const offset = (currentPage - 1) * itemsPerPage;
    const currentJettons = jettons.slice(offset, offset + itemsPerPage); 

    const keyboard = [];
    const rowSize = 3;

    for (let i = 0; i < currentJettons.length; i += rowSize) {
        const row = currentJettons.slice(i, i + rowSize).map(jetton => ({
            text: jetton.symbol,
            callback_data: `jetton_${toUserFriendlyAddress(jetton.address)}`,
        }));
        keyboard.push(row);
    }

    const navigationRow = [];
    if (currentPage > 1) {
        navigationRow.push({ text: '⬅️', callback_data: `jtnsp_${currentPage - 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' });
    }

    navigationRow.push({ text: `· ${currentPage} / ${totalPages} ·`, callback_data: 'noop' });

    if (currentPage < totalPages) {
        navigationRow.push({ text: '➡️', callback_data: `jtnsp_${currentPage + 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' }); 
    }

    keyboard.push(navigationRow);

    keyboard.push([{ text: '📋 Меню', callback_data: 'Menu' }]);

    return {
        inline_keyboard: keyboard,
    };
}

export function generateNFTListKeyboard(names, currentPage = 1) {
    const itemsPerPage = 5; 
    const totalPages = Math.ceil(names.length / itemsPerPage); 
    const offset = (currentPage - 1) * itemsPerPage; 
    const currentNames = names.slice(offset, offset + itemsPerPage); 

    const keyboard = [];
    const rowSize = 1;

    for (let i = 0; i < currentNames.length; i += rowSize) {
        const row = currentNames.slice(i, i + rowSize).map(name => ({
            text: name,
            callback_data: `clct_${name}`,
        }));
        keyboard.push(row);
    }

    const navigationRow = [];
    if (currentPage > 1) {
        navigationRow.push({ text: '⬅️', callback_data: `nft_page_${currentPage - 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' }); 
    }

    navigationRow.push({ text: `· ${currentPage} / ${totalPages} ·`, callback_data: 'noop' });

    if (currentPage < totalPages) {
        navigationRow.push({ text: '➡️', callback_data: `nft_page_${currentPage + 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' }); 
    }

    keyboard.push(navigationRow);

    keyboard.push([{ text: '« Назад', callback_data: 'Menu' }]);

    return {
        inline_keyboard: keyboard,
    };
}

export function generateNFTListForSelectKeyboard(collections, currentPage = 1) {
    const itemsPerPage = 5; 
    const totalPages = Math.ceil(collections.length / itemsPerPage); 
    const offset = (currentPage - 1) * itemsPerPage; 
    const currentCollections = collections.slice(offset, offset + itemsPerPage); 

    const keyboard = [];
    const rowSize = 1;

    for (let i = 0; i < currentCollections.length; i += rowSize) {
        const row = currentCollections.slice(i, i + rowSize).map(collection => ({
            text: collection.name,
            callback_data: `nft_${toUserFriendlyAddress(collection.address)}`,
        }));
        keyboard.push(row);
    }

    const navigationRow = [];
    if (currentPage > 1) {
        navigationRow.push({ text: '⬅️', callback_data: `nftsp_${currentPage - 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' }); 
    }

    navigationRow.push({ text: `· ${currentPage} / ${totalPages} ·`, callback_data: 'noop' });

    if (currentPage < totalPages) {
        navigationRow.push({ text: '➡️', callback_data: `nftsp_${currentPage + 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' }); 
    }

    keyboard.push(navigationRow);

    keyboard.push([{ text: '📋 Меню', callback_data: 'Menu' }]);

    return {
        inline_keyboard: keyboard,
    };
}

export async function generateTokenListingKeyboard(listingManager) {
    return {
        inline_keyboard: [
            [
                { text: 'Отправить Заявку', url: listingManager },
            ],
            [
                { text: '🟨 DeDust', url: 'https://dedust.io/swap/TON/EQB9QBqniFI0jOmw3PU6v1v4LU3Sivm9yPXDDB9Qf7cXTDft' },
            ],
            [
                { text: '« Назад', callback_data: 'Menu' }
            ],
        ],
    };
}

export function generateChoosePrivateChatCategoryKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: 'Jetton', callback_data: 'SelectJetton' },
                { text: 'NFT', callback_data: 'SelectNFT' },
            ],
            // [
            //     { text: 'Jetton + NFT', callback_data: 'SelectJettonNFT' }
            // ],
            [
                { text: '📋 Меню', callback_data: 'Menu' }
            ],
        ],
    };
}

export function generateUserChatsKeyboard(chats, currentPage = 1) {
    const itemsPerPage = 5; 
    const totalPages = Math.ceil(chats.length / itemsPerPage); 
    const offset = (currentPage - 1) * itemsPerPage; 
    const currentChats = chats.slice(offset, offset + itemsPerPage); 

    const keyboard = [];
    const rowSize = 1;

    for (let i = 0; i < currentChats.length; i += rowSize) {
        const row = currentChats.slice(i, i + rowSize).map(chat => ({
            text: chat.name,
            callback_data: `mychat_info_${chat.chatId}_${currentPage}`, 
        }));
        keyboard.push(row);
    }

    const navigationRow = [];
    if (currentPage > 1) {
        navigationRow.push({ text: '⬅️', callback_data: `chats_page_${currentPage - 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' });
    }

    navigationRow.push({ text: `· ${currentPage} / ${totalPages} ·`, callback_data: 'noop' });

    if (currentPage < totalPages) {
        navigationRow.push({ text: '➡️', callback_data: `chats_page_${currentPage + 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' });
    }

    keyboard.push(navigationRow);

    keyboard.push([{ text: '« Назад', callback_data: 'Menu' }]);

    return {
        inline_keyboard: keyboard,
    };
}

export function generatePrivateChatsKeyboard(chats, currentPage = 1) {
    const itemsPerPage = 5; 
    const totalPages = Math.ceil(chats.length / itemsPerPage);
    const offset = (currentPage - 1) * itemsPerPage;
    const currentChats = chats.slice(offset, offset + itemsPerPage);

    const keyboard = [];
    const rowSize = 1; 

    for (let i = 0; i < currentChats.length; i += rowSize) {
        const row = currentChats.slice(i, i + rowSize).map(chat => ({
            text: chat.name,
            callback_data: `chat_requirements_${chat.chatId}_${currentPage}`, 
        }));
        keyboard.push(row);
    }

    const navigationRow = [];
    if (currentPage > 1) {
        navigationRow.push({ text: '⬅️', callback_data: `private_page_${currentPage - 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' }); 
    }

    navigationRow.push({ text: `· ${currentPage} / ${totalPages} ·`, callback_data: 'noop' });

    if (currentPage < totalPages) {
        navigationRow.push({ text: '➡️', callback_data: `private_page_${currentPage + 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' }); 
    }

    keyboard.push(navigationRow);

    keyboard.push([{ text: '« Назад', callback_data: 'Menu' }]);

    return {
        inline_keyboard: keyboard,
    };
}