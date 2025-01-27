import { getUserById } from "../db/userMethods.js";
import { getNftBalance } from "../utils/getUserBalances/getNftBalance.js";
import { delay } from "../utils/defay.js";
import { getAllPrivateNftChats } from "../db/chatMethods.js";
import Chat from "../models/Chat.js";

export async function nftPrivateChat({ chatId, msg, bot }) {
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
        if (!chat || !chat.nft || !chat.nft.collectionAddress) {
            console.log(`NFT chat with ID ${chatId} not properly configured.`);
            return;
        }

        const { collectionAddress, nftRequirement } = chat.nft;
        const userNftBalance = await getNftBalance(walletAddress, collectionAddress);

        console.log(`User ID: ${userId}, Wallet: ${walletAddress}, NFT Balance: ${userNftBalance.length} NFTs`);

        if (userNftBalance.length >= nftRequirement) {
            await Chat.updateOne(
                { chatId },
                { $addToSet: { members: userId } } 
            );

            await bot.approveChatJoinRequest(chatId, userId);
            await bot.sendMessage(chatId, `🎉 Welcome to the private NFT chat, ${msg.from.first_name || "User"}!`);
            console.log(`User ${userId} added to NFT chat ${chatId}.`);
        } else {
            console.log(`User ${userId} does not meet the NFT requirement for chat ${chatId}.`);
        }
    } catch (error) {
        console.error("Error handling NFT chat join request:", error.message);
    }
}

export async function startNftChatBalanceChecker(bot) {
    setInterval(async () => {
        try {
            const nftChats = await getAllPrivateNftChats(); 
            console.log('nft');

            for (const chat of nftChats) {
                const { chatId, nft } = chat;

                if (!nft || !nft.collectionAddress || !nft.nftRequirement) {
                    console.log(`Chat ${chatId} is not properly configured for NFT checks.`);
                    continue;
                }

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

                        const userNftBalance = await getNftBalance(walletAddress, collectionAddress);

                        console.log(
                            `Checking user ${userId} in chat ${chatId}: wallet = ${walletAddress}, NFT Balance = ${userNftBalance.length}, Requirement = ${nftRequirement}`
                        );

                        if (userNftBalance.length < nftRequirement) {
                            console.log(`User ${userId} does not meet the NFT requirement for chat ${chatId}. Removing...`);
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
            console.error("Error during NFT balance checking:", error.message);
        }
    }, 35000); 
}

export async function handleNftMemberUpdatesNft(bot) {
    bot.on("chat_member_left", async (msg) => {
        const chatId = String(msg.chat.id);
        const userId = String(msg.from.id);

        try {
            await Chat.updateOne({ chatId }, { $pull: { members: userId } }); 
            console.log(`User ${userId} left or was removed from NFT chat ${chatId}.`);
        } catch (error) {
            console.error("Error handling member update:", error.message);
        }
    });

    bot.on("chat_member_removed", async (msg) => {
        const chatId = String(msg.chat.id);
        const userId = String(msg.from.id);

        try {
            await Chat.updateOne({ chatId }, { $pull: { members: userId } }); 
            console.log(`User ${userId} was removed from NFT chat ${chatId}.`);
        } catch (error) {
            console.error("Error handling member removal:", error.message);
        }
    });
}