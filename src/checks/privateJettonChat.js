import { getUserById } from "../db/userMethods.js";
import { getJettonData } from "../utils/getTokensData/getJettonData.js";
import getJettonBalance from "../utils/getUserBalances/getJettonBalance.js";
import { delay } from "../utils/defay.js";
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

        const { jettonAddress, jettonRequirement, symbol } = chat.jetton;
        const jettonData = await getJettonData(jettonAddress);
        const userJettonBalance = await getJettonBalance(walletAddress, jettonAddress, jettonData.decimals);

        console.log(`User ID: ${userId}, Wallet: ${walletAddress}, Balance: ${userJettonBalance} ${symbol}`);

        if (userJettonBalance >= jettonRequirement) {
            await Chat.updateOne(
                { chatId },
                { $addToSet: { members: userId } } 
            );

            await bot.approveChatJoinRequest(chatId, userId);
            await bot.sendMessage(chatId, `🎉 Welcome to the private Jetton chat, ${msg.from.first_name || "User"}!`);
            console.log(`User ${userId} added to Jetton chat ${chatId}.`);
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
    }, 30000); 
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