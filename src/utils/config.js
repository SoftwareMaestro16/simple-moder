import { getAdminStructure } from "../db/adminMethods.js";

export let jettonListingPrice = null;
export let nftListingPrice = null;
export let coreMedia = {
    coreChannel: {
        id: 0,
        link: 'https://t.me/just_a_simple_coin'
    },
    coreChat: {
        id: 0,
        link: 'https://t.me/simplecoin_chatSC'
    }
};
export let admins = [];

export async function loadAdminData() {
    try {
        const adminData = await getAdminStructure();
        console.log('Полученные данные:', adminData);

        if (adminData) {
            jettonListingPrice = adminData.jettonListingPrice;
            nftListingPrice = adminData.nftListingPrice;
            coreMedia = {
                coreChannel: {
                    id: adminData.coreChannel?.id || 0,
                    link: adminData.coreChannel?.link || 'https://t.me/default_channel',
                },
                coreChat: {
                    id: adminData.coreChat?.id || 0,
                    link: adminData.coreChat?.link || 'https://t.me/default_chat',
                },
            };
            admins = adminData.adminsList;

            console.log('Админ данные успешно загружены.');
        } else {
            console.warn('Админ данные не найдены.');
        }

        return {
            jettonListingPrice,
            nftListingPrice,
            coreMedia,
            admins,
        };
    } catch (error) {
        console.error('Ошибка при загрузке админ данных:', error);
        throw error;
    }
}

(async () => {
  await loadAdminData();

})();