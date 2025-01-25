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
    const itemsPerPage = 12; // Максимум жетонов на странице
    const totalPages = Math.ceil(symbols.length / itemsPerPage); // Всего страниц
    const offset = (currentPage - 1) * itemsPerPage; // Считаем начальный индекс для текущей страницы
    const currentSymbols = symbols.slice(offset, offset + itemsPerPage); // Берём только нужные жетоны для текущей страницы

    const keyboard = [];
    const rowSize = 3;

    // Генерация строк жетонов для текущей страницы
    for (let i = 0; i < currentSymbols.length; i += rowSize) {
        const row = currentSymbols.slice(i, i + rowSize).map(symbol => ({
            text: symbol,
            callback_data: `jtn_${symbol}`,
        }));
        keyboard.push(row);
    }

    // Добавляем стрелки навигации внизу
    const navigationRow = [];
    if (currentPage > 1) {
        navigationRow.push({ text: '⬅️', callback_data: `jtn_page_${currentPage - 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' }); // Заглушка
    }

    navigationRow.push({ text: `· ${currentPage} / ${totalPages} ·`, callback_data: 'noop' });

    if (currentPage < totalPages) {
        navigationRow.push({ text: '➡️', callback_data: `jtn_page_${currentPage + 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' }); // Заглушка
    }

    keyboard.push(navigationRow);

    // Добавляем кнопку "Назад"
    keyboard.push([{ text: '« Назад', callback_data: 'Menu' }]);

    return {
        inline_keyboard: keyboard,
    };
}

export function generateJettonListForSelectKeyboard(jettons, currentPage = 1) {
    const itemsPerPage = 12; // Максимум жетонов на странице
    const totalPages = Math.ceil(jettons.length / itemsPerPage); // Всего страниц
    const offset = (currentPage - 1) * itemsPerPage; // Считаем начальный индекс для текущей страницы
    const currentJettons = jettons.slice(offset, offset + itemsPerPage); // Берём только нужные жетоны для текущей страницы

    const keyboard = [];
    const rowSize = 3;

    // Генерация строк жетонов для текущей страницы
    for (let i = 0; i < currentJettons.length; i += rowSize) {
        const row = currentJettons.slice(i, i + rowSize).map(jetton => ({
            text: jetton.symbol,
            callback_data: `jetton_${toUserFriendlyAddress(jetton.address)}`,
        }));
        keyboard.push(row);
    }

    // Добавляем стрелки навигации внизу
    const navigationRow = [];
    if (currentPage > 1) {
        navigationRow.push({ text: '⬅️', callback_data: `jtnsp_${currentPage - 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' }); // Заглушка
    }

    navigationRow.push({ text: `· ${currentPage} / ${totalPages} ·`, callback_data: 'noop' });

    if (currentPage < totalPages) {
        navigationRow.push({ text: '➡️', callback_data: `jtnsp_${currentPage + 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' }); // Заглушка
    }

    keyboard.push(navigationRow);

    // Добавляем кнопку "Назад"
    keyboard.push([{ text: '« Назад', callback_data: 'Menu' }]);

    return {
        inline_keyboard: keyboard,
    };
}

export function generateNFTListKeyboard(names, currentPage = 1) {
    const itemsPerPage = 3; // Максимум коллекций на странице
    const totalPages = Math.ceil(names.length / itemsPerPage); // Всего страниц
    const offset = (currentPage - 1) * itemsPerPage; // Считаем начальный индекс для текущей страницы
    const currentNames = names.slice(offset, offset + itemsPerPage); // Берём только нужные коллекции для текущей страницы

    const keyboard = [];
    const rowSize = 3;

    // Генерация строк NFT коллекций для текущей страницы
    for (let i = 0; i < currentNames.length; i += rowSize) {
        const row = currentNames.slice(i, i + rowSize).map(name => ({
            text: name,
            callback_data: `clct_${name}`,
        }));
        keyboard.push(row);
    }

    // Добавляем стрелки навигации внизу
    const navigationRow = [];
    if (currentPage > 1) {
        navigationRow.push({ text: '⬅️', callback_data: `nft_page_${currentPage - 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' }); // Заглушка
    }

    navigationRow.push({ text: `· ${currentPage} / ${totalPages} ·`, callback_data: 'noop' });

    if (currentPage < totalPages) {
        navigationRow.push({ text: '➡️', callback_data: `nft_page_${currentPage + 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' }); // Заглушка
    }

    keyboard.push(navigationRow);

    // Добавляем кнопку "Назад"
    keyboard.push([{ text: '« Назад', callback_data: 'Menu' }]);

    return {
        inline_keyboard: keyboard,
    };
}

export function generateNFTListForSelectKeyboard(collections, currentPage = 1) {
    const itemsPerPage = 3; // Максимум коллекций на странице
    const totalPages = Math.ceil(collections.length / itemsPerPage); // Всего страниц
    const offset = (currentPage - 1) * itemsPerPage; // Считаем начальный индекс для текущей страницы
    const currentCollections = collections.slice(offset, offset + itemsPerPage); // Берём только нужные коллекции для текущей страницы

    const keyboard = [];
    const rowSize = 3;

    // Генерация строк коллекций для текущей страницы
    for (let i = 0; i < currentCollections.length; i += rowSize) {
        const row = currentCollections.slice(i, i + rowSize).map(collection => ({
            text: collection.name,
            callback_data: `nft_${toUserFriendlyAddress(collection.address)}`,
        }));
        keyboard.push(row);
    }

    // Добавляем стрелки навигации внизу
    const navigationRow = [];
    if (currentPage > 1) {
        navigationRow.push({ text: '⬅️', callback_data: `nftsp_${currentPage - 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' }); // Заглушка
    }

    navigationRow.push({ text: `· ${currentPage} / ${totalPages} ·`, callback_data: 'noop' });

    if (currentPage < totalPages) {
        navigationRow.push({ text: '➡️', callback_data: `nftsp_${currentPage + 1}` });
    } else {
        navigationRow.push({ text: '🔘', callback_data: 'noop' }); // Заглушка
    }

    keyboard.push(navigationRow);

    // Добавляем кнопку "Назад"
    keyboard.push([{ text: '« Назад', callback_data: 'Menu' }]);

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
            [
                { text: 'Jetton + NFT', callback_data: 'SelectJettonNFT' }
            ],
            [
                { text: '📋 Меню', callback_data: 'Menu' }
            ],
        ],
    };
}

