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

export function generateJettonListKeyboard(symbols) {
    const keyboard = [];
    const rowSize = 3; 

    for (let i = 0; i < symbols.length; i += rowSize) {
        const row = symbols.slice(i, i + rowSize).map(symbol => ({
            text: symbol, 
            callback_data: `jetton_${symbol}` 
        }));
        keyboard.push(row);
    }

    keyboard.push([
        { text: '« Назад', callback_data: 'Menu' }
    ]);

    return {
        inline_keyboard: keyboard
    };
}

export function generateNFTListKeyboard(names) {
    const keyboard = [];
    const rowSize = 1; 

    for (let i = 0; i < names.length; i += rowSize) {
        const row = names.slice(i, i + rowSize).map(name => ({
            text: name, 
            callback_data: `collection_${name}` 
        }));
        keyboard.push(row);
    }

    keyboard.push([
        { text: '« Назад', callback_data: 'Menu' }
    ]);

    return {
        inline_keyboard: keyboard
    };
}

export async function generateTokenListingKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: 'Jetton Заявка', callback_data: 'None' },
                { text: 'NFT Заявка', callback_data: 'None' },
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