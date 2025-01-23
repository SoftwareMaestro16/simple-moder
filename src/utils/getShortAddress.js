export function getShortAddress(address) {
    if (!address || typeof address !== 'string') {
        console.error('Invalid address provided:', address);
        return 'Не подключен'; 
    }
    
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}