import { getUserById } from "../db/userMethods.js";
import getJettonBalance from "../utils/getUserBalances/getJettonBalance.js";
import getNftBalance from "../utils/getUserBalances/getNftBalance.js";
import { delay } from "../utils/defay.js";
import { getJettonData } from "../utils/getTokensData/getJettonData.js"; 
import Chat from "../models/Chat.js";
import { getAllComboChats } from "../db/chatMethods.js";

export async function comboPrivateChat({ chatId, msg, bot }) {
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
        if (!chat || !chat.jetton || !chat.nft || !chat.jetton.jettonAddress || !chat.nft.collectionAddress) {
            console.log(`Combo chat with ID ${chatId} not properly configured.`);
            return;
        }

        const { jettonAddress, jettonRequirement, symbol } = chat.jetton;
        const { collectionAddress, nftRequirement } = chat.nft;

        const jettonData = await getJettonData(jettonAddress);
        const { decimals } = jettonData;

        const userJettonBalance = await getJettonBalance(walletAddress, jettonAddress, decimals);
        const userNftBalance = await getNftBalance(walletAddress, collectionAddress);

        console.log(`User ID: ${userId}, Wallet: ${walletAddress}, Jetton Balance: ${userJettonBalance} ${symbol}, NFT Balance: ${userNftBalance.length} NFTs`);

        if (userJettonBalance >= jettonRequirement && userNftBalance.length >= nftRequirement) {
            await Chat.updateOne(
                { chatId },
                { $addToSet: { members: userId } }
            );

            await bot.approveChatJoinRequest(chatId, userId);
            await bot.sendMessage(chatId, `🎉 Welcome to the private Combo chat, ${msg.from.first_name || "User"}!`);
            console.log(`User ${userId} added to Combo chat ${chatId}.`);
        } else {
            console.log(`User ${userId} does not meet the requirements for the Combo chat ${chatId}.`);
        }
    } catch (error) {
        console.error("Error handling combo chat join request:", error.message);
    }
}

export async function startComboChatBalanceChecker(bot) {
    setInterval(async () => {
        try {
            const comboChats = await getAllComboChats(); 
            console.log('combo');
            
            for (const chat of comboChats) {
                const { chatId, jetton, nft } = chat;

                if (!jetton || !jetton.jettonAddress || !jetton.jettonRequirement || !nft || !nft.collectionAddress || !nft.nftRequirement) {
                    console.log(`Chat ${chatId} is not properly configured for combo checks.`);
                    continue;
                }

                const { jettonAddress, jettonRequirement, decimals = 0 } = jetton;
                const { collectionAddress, nftRequirement } = nft;

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
                            await bot.banChatMember(chatId, userId); 
                            await bot.unbanChatMember(chatId, userId);
                            await Chat.updateOne({ chatId }, { $pull: { members: userId } });
                            continue; 
                        }

                        const userJettonBalance = await getJettonBalance(walletAddress, jettonAddress, decimals);
                        const userNftBalance = await getNftBalance(walletAddress, collectionAddress);

                        console.log(`Checking user ${userId} in combo chat ${chatId}: wallet = ${walletAddress}, Jetton Balance = ${userJettonBalance}, NFT Balance = ${userNftBalance.length}`);

                        if (userJettonBalance >= jettonRequirement && userNftBalance.length >= nftRequirement) {
                            console.log(`User ${userId} meets the combo chat requirements.`);
                        } else {
                            console.log(`User ${userId} does not meet the combo chat requirements. Removing...`);
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
            console.error("Error during combo chat balance checking:", error.message);
        }
    }, 10000);  
}

export async function handleMemberUpdatesCombo(bot) {
    bot.on("chat_member_left", async (msg) => {
        const chatId = String(msg.chat.id);
        const userId = String(msg.from.id);

        try {
            await Chat.updateOne({ chatId }, { $pull: { members: userId } });
            console.log(`User ${userId} left or was removed from combo chat ${chatId}.`);
        } catch (error) {
            console.error("Error handling member update:", error.message);
        }
    });

    bot.on("chat_member_removed", async (msg) => {
        const chatId = String(msg.chat.id);
        const userId = String(msg.from.id);

        try {
            await Chat.updateOne({ chatId }, { $pull: { members: userId } });
            console.log(`User ${userId} was removed from combo chat ${chatId}.`);
        } catch (error) {
            console.error("Error handling member removal:", error.message);
        }
    });
}