import { getAllPrivateJettonChats, getAllPrivateNftChats, getAllComboChats } from "../db/chatMethods.js";
import { jettonPrivateChat } from "./privateJettonChat.js";
import { nftPrivateChat } from "./privateNftChat.js";
import { comboPrivateChat } from "./privateComboChat.js"; 

export async function handlePrivateChats(bot) {
  try {
    let jettonChats = [];
    let nftChats = [];
    let comboChats = [];

    const updateChats = async () => {
      jettonChats = await getAllPrivateJettonChats();
      nftChats = await getAllPrivateNftChats();
      comboChats = await getAllComboChats();

      // console.log("Jetton Chats:", jettonChats);
      // console.log("NFT Chats:", nftChats);
      // console.log("Combo Chats:", comboChats);
    };

    bot.on("chat_join_request", async (msg) => {
      try {
        const chatId = String(msg.chat.id);

        const isComboChat = comboChats.some((chat) => String(chat.chatId) === chatId);
        if (isComboChat) {
          console.log(`Запрос на вступление в Combo-чат: ${chatId}`);
          await comboPrivateChat({ chatId, msg, bot });
        } else {
          const isNftChat = nftChats.some((chat) => String(chat.chatId) === chatId);
          if (isNftChat) {
            console.log(`Запрос на вступление в NFT-чат: ${chatId}`);
            await nftPrivateChat({ chatId, msg, bot });
          } else {
            const isJettonChat = jettonChats.some((chat) => String(chat.chatId) === chatId);
            if (isJettonChat) {
              console.log(`Запрос на вступление в Jetton-чат: ${chatId}`);
              await jettonPrivateChat({ chatId, msg, bot });
            } else {
              console.log(`Чат ${chatId} не найден в списке Jetton-, NFT- или Combo-чатов.`);
            }
          }
        }
      } catch (error) {
        console.error('Ошибка при обработке запроса на вступление в чат:', error.message);
      }
    });

    await updateChats();

    setInterval(updateChats, 4000);

  } catch (error) {
    console.error('Ошибка при настройке обработчика приватных чатов:', error.message);
  }
}