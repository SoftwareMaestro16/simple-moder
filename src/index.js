import bot from './bot.js';
import { handlePrivateChats } from './checks/privateChats.js';
import { handleMemberUpdatesCombo, startComboChatBalanceChecker } from './checks/privateComboChat.js';
import { handleMemberUpdatesJetton, startJettonChatBalanceChecker } from './checks/privateJettonChat.js';
import { handleNftMemberUpdatesNft, startNftChatBalanceChecker } from './checks/privateNftChat.js';
import { handlePublicChats } from './checks/publicChat.js';
import connectToDatabase from './db/database.js';
import { registerCommands } from './interactions/commands.js';
import { registerCallbackQueries } from './interactions/menu.js';

async function main() {
    try {
        if (typeof global.CustomEvent === 'undefined') {
            global.CustomEvent = class CustomEvent {
                constructor(event, params) {
                    params = params || { bubbles: false, cancelable: false, detail: null };
                    this.type = event;
                    this.detail = params.detail;
                }
            };
        }

        await connectToDatabase();
        // console.log('Подключение к базе данных успешно.');
        await registerCallbackQueries(bot);

        registerCommands(bot);
        await handlePublicChats(bot);
        await handlePrivateChats(bot);

        await startJettonChatBalanceChecker(bot);
        await handleMemberUpdatesJetton(bot);

        await startNftChatBalanceChecker(bot);
        await handleNftMemberUpdatesNft(bot);

        await startComboChatBalanceChecker(bot);
        await handleMemberUpdatesCombo(bot);

        console.log('Started.');
    } catch (error) {
        console.error('Ошибка при запуске:', error);
        process.exit(1);
    }
}

main();

