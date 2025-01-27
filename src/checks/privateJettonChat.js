import { getUserById } from "../db/userMethods.js";
import { getJettonData } from "../utils/getTokensData/getJettonData.js";
import getJettonBalance from "../utils/getUserBalances/getJettonBalance.js";
import { delay } from "../utils/delay.js";
import { getAllPrivateJettonChats } from "../db/chatMethods.js";
import Chat from "../models/Chat.js";

export async function jettonPrivateChat({ chatId, msg, bot }) {
    try {
        const userId = String(msg.from.id);
        const user = await getUserById(userId);

        if (!user) {
            console.log(`User with ID ${userId} not found in the database.`);
            return;
        }

        const walletAddress = user.walletAddress;
        if (!walletAddress || walletAddress === null || walletAddress === 'Не подключен' || walletAddress === undefined) {
            console.log(`Wallet address not found for user ID ${userId}.`);
            return;
        }

        const chat = await Chat.findOne({ chatId });
        if (!chat || !chat.jetton || !chat.jetton.jettonAddress) {
            console.log(`Jetton chat with ID ${chatId} not properly configured.`);
            return;
        }

        await delay(4100); 
        const { jettonAddress, jettonRequirement, symbol } = chat.jetton;
        const jettonData = await getJettonData(jettonAddress);
        await delay(4100); 
        const userJettonBalance = await getJettonBalance(walletAddress, jettonAddress, jettonData.decimals);

        console.log(`User ID: ${userId}, Wallet: ${walletAddress}, Balance: ${userJettonBalance} ${symbol}`);

        let welcomeMessageSent = false;

        if (userJettonBalance >= jettonRequirement) {
            const alreadyInChat = chat.members.includes(userId);
            if (!alreadyInChat) {
                await Chat.updateOne(
                    { chatId },
                    { $addToSet: { members: userId } } 
                );
            }

            try {
                await bot.approveChatJoinRequest(chatId, userId);
                console.log(`User ${userId} successfully approved to join the chat ${chatId}.`);
            } catch (error) {
                if (error.response && error.response.error_code === 400 && error.response.description === "USER_ALREADY_PARTICIPANT") {
                    console.log(`User ${userId} is already a participant. Removing and re-approving.`);
                    
                    await bot.banChatMember(chatId, userId); 
                    await bot.unbanChatMember(chatId, userId); 
                    await bot.approveChatJoinRequest(chatId, userId);
                    console.log(`User ${userId} re-approved to join the chat ${chatId}.`);
                } else {
                    console.error('Error handling join request:', error.message);
                }
            }

            if (!welcomeMessageSent) { 
                const welcomeMessage = `🎉 Добро пожаловать, ${msg.from.first_name || "Пользователь"}, в наш приватный чат!`;
                await bot.sendMessage(chatId, welcomeMessage);
                console.log(`User ${userId} added to Jetton chat ${chatId}.`);
                welcomeMessageSent = true;  
            }
        } else {
            console.log(`User ${userId} does not meet the jetton requirement for chat ${chatId}.`);
        }
    } catch (error) {
        console.error("Error handling jetton chat join request:", error.message);
    }
}

export async function startJettonChatBalanceChecker(bot) {
    setInterval(async () => {
        try {
            const jettonChats = await getAllPrivateJettonChats();
            console.log('jetton');
            
            for (const chat of jettonChats) {
                const { chatId, jetton } = chat;

                if (!jetton || !jetton.jettonAddress || !jetton.jettonRequirement) {
                    console.log(`Chat ${chatId} is not properly configured for jetton checks.`);
                    continue;
                }

                const { jettonAddress, jettonRequirement, decimals = 0 } = jetton;

                for (const userId of chat.members) {
                    try {
                        await delay(3000);

                        const user = await getUserById(userId);
                        if (!user) {
                            console.log(`User with ID ${userId} not found, removing from chat members.`);
                            await Chat.updateOne({ chatId }, { $pull: { members: userId } });
                            continue;
                        }

                        const walletAddress = user.walletAddress;
                        if (!walletAddress || walletAddress === null || walletAddress === 'Не подключен' || walletAddress === undefined) {
                            console.log(`User ${userId} has no wallet address. Removing from members and kicking from chat ${chatId}.`);
                        
                            try {
                                await bot.banChatMember(chatId, userId); 
                                await bot.unbanChatMember(chatId, userId);
                            } catch (error) {
                                console.error(`Error kicking user ${userId} from chat ${chatId}:`, error.message);
                            }
                        
                            try {
                                await Chat.updateOne({ chatId }, { $pull: { members: userId } });
                                console.log(`User ${userId} successfully removed from the database.`);
                            } catch (error) {
                                console.error(`Error updating database for user ${userId}:`, error.message);
                            }
                        
                            continue; 
                        }

                        await delay(5200); 
                        const userJettonBalance = await getJettonBalance(walletAddress, jettonAddress, decimals);

                        console.log(
                            `Checking user ${userId} in chat ${chatId}: wallet = ${walletAddress}, balance = ${userJettonBalance}, requirement = ${jettonRequirement}`
                        );

                        if (userJettonBalance < jettonRequirement) {
                            console.log(`User ${userId} does not meet the jetton requirement for chat ${chatId}. Removing...`);
                            await bot.banChatMember(chatId, userId); 
                            await bot.unbanChatMember(chatId, userId); 
                            await Chat.updateOne({ chatId }, { $pull: { members: userId } }); 
                        }
                    } catch (userError) {
                        console.error(`Error processing user ${userId} in chat ${chatId}:`, userError.message);
                    }
                }
            }
        } catch (error) {
            console.error("Error during jetton balance checking:", error.message);
        }
    }, 35000); 
}

export async function handleMemberUpdatesJetton(bot) {
    bot.on("chat_member_left", async (msg) => {
        const chatId = String(msg.chat.id);
        const userId = String(msg.from.id);

        try {
            await Chat.updateOne({ chatId }, { $pull: { members: userId } }); 
            console.log(`User ${userId} left or was removed from chat ${chatId}.`);
        } catch (error) {
            console.error("Error handling member update:", error.message);
        }
    });

    bot.on("chat_member_removed", async (msg) => {
        const chatId = String(msg.chat.id);
        const userId = String(msg.from.id);

        try {
            await Chat.updateOne({ chatId }, { $pull: { members: userId } }); 
            console.log(`User ${userId} was removed from chat ${chatId}.`);
        } catch (error) {
            console.error("Error handling member removal:", error.message);
        }
    });
}