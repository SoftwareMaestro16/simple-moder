import Admin from "../models/Admin.js";

export async function getAdminStructure() {
    try {
        const adminData = await Admin.findOne();

        if (!adminData) {
            return null;
        }

        return adminData;
    } catch (error) {
        console.error('Ошибка при получении данных администратора:', error);
        throw error;
    }
}

export async function setJettonListingPrice(price) {
    try {
        let admin = await Admin.findOne({ });

        if (!admin) {
            admin = new Admin(); 
            await admin.save(); 
        }

        admin.jettonListingPrice = price;

        await admin.save();
        return admin;
    } catch (error) {
        console.error('Ошибка при обновлении:', error);
        throw error;
    }
}

export async function setCollectionListingPrice(price) {
    try {
        let admin = await Admin.findOne({ });

        if (!admin) {
            admin = new Admin(); 
            await admin.save(); 
        }

        admin.nftListingPrice = price;

        await admin.save();
        return admin;
    } catch (error) {
        console.error('Ошибка при обновлении:', error);
        throw error;
    }
}

export async function addAdmin(adminId) {
    try {
        let admin = await Admin.findOne({});
        if (!admin) {
            admin = new Admin(); 
            await admin.save();
        }

        if (admin.adminsList.includes(Number(adminId))) {
            return null;
        }

        admin.adminsList.push(Number(adminId));
        await admin.save();
        return admin;
    } catch (error) {
        console.error('Ошибка при добавлении администратора:', error);
        throw error;
    }
}

export async function removeAdmin(adminId) {
    try {
        let admin = await Admin.findOne({});
        if (!admin) {
            return null;
        }

        const adminIndex = admin.adminsList.indexOf(Number(adminId));
        if (adminIndex === -1) {
            return null;
        }

        admin.adminsList.splice(adminIndex, 1);
        await admin.save();
        return admin;
    } catch (error) {
        console.error('Ошибка при удалении администратора:', error);
        throw error;
    }
}

export async function getAdmins() {
    try {
        const admin = await Admin.findOne({});

        if (!admin) {
            return [];
        }

        return admin.adminsList;
    } catch (error) {
        console.error('Ошибка при получении администратора:', error);
        throw error;
    }
}

export async function setCoreChannel(channelId, link) {
    try {
        let admin = await Admin.findOne();

        if (!admin) {
            admin = new Admin();
        }

        admin.coreChannel = {
            id: channelId,
            link: link,
        };

        await admin.save();
        return admin;
    } catch (error) {
        console.error('Ошибка при обновлении Core Channel:', error);
        throw error;
    }
}

export async function setCoreChat(chatId, link) {
    try {
        let admin = await Admin.findOne();

        if (!admin) {
            admin = new Admin(); 
            await admin.save(); 
        }

        admin.coreChat = {
            id: chatId,
            link: link
        }

        await admin.save();
        return admin;
    } catch (error) {
        console.error('Ошибка при обновлении:', error);
        throw error;
    }
}

export async function getCoreMedia() {
    try {
        const admin = await Admin.findOne({});

        if (!admin) {
            return [];
        }

        return {
            coreChannel: admin.coreChannel,
            coreChat: admin.coreChat,
        };
    } catch (error) {
        console.error('Ошибка при получении администратора:', error);
        throw error;
    }
}

export async function getTokensListingPrice() {
    try {
        const admin = await Admin.findOne({});

        if (!admin) {
            return [];
        }

        return {
            jettonListingPrice: admin.jettonListingPrice,
            nftListingPrice: admin.nftListingPrice
        };
    } catch (error) {
        console.error('Ошибка при получении администратора:', error);
        throw error;
    }
}

export async function setListingManager(userLink) {
    try {
        let admin = await Admin.findOne({ });

        if (!admin) {
            admin = new Admin(); 
            await admin.save(); 
        }

        admin.listingManager = userLink;

        await admin.save();
        return admin;
    } catch (error) {
        console.error('Ошибка при обновлении:', error);
        throw error;
    }
}

export async function getListingManager() {
    try {
        const admin = await Admin.findOne({});

        if (!admin) {
            return '';
        }

        const listingManager = admin.listingManager; 

        return listingManager;
    } catch (error) {
        console.error('Ошибка при получении листинг менеджера:', error);
        throw error;
    }
}