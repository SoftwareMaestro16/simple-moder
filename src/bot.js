import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { registerCommands } from './interactions/commands.js';

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

export default bot;