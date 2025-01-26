import bot from './bot.js';
import { handleComboChats } from './checks/privateComboChat.js';
import { handlePrivateJettonChats } from './checks/privateJettonChat.js';
import { handlePrivateNftChats } from './checks/privateNftChat.js';
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
        await handlePrivateJettonChats(bot);
        await handlePrivateNftChats(bot);
        await handleComboChats(bot);

        console.log('Started.');
    } catch (error) {
        console.error('Ошибка при запуске:', error);
        process.exit(1);
    }
}

main();

import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello, Heroku!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});