import bot from "../bot.js";
import { coreMedia } from "./config.js"; 

export async function checkCoreSubscription(userId) {
    try {
        const channelMember = await bot.getChatMember(coreMedia.coreChannel.id, userId);
        const isChannelMember = ['member', 'administrator', 'creator'].includes(channelMember?.status);

        const chatMember = await bot.getChatMember(coreMedia.coreChat.id, userId);
        const isChatMember = ['member', 'administrator', 'creator'].includes(chatMember?.status);

        return isChannelMember && isChatMember;
    } catch (error) {
        console.error('Ошибка проверки подписки:', error);
        return false; 
    }
}