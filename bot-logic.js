const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');

function createBot(username, role) {
    const bot = mineflayer.createBot({ 
        // IP ve Portu buraya doğrudan yazıyoruz, artık ENV'ye gerek yok
        host: 'BURAYA_SUNUCU_IP_YAZ', 
        port: 25565, 
        username: username, 
        version: '1.21.1' 
    });
    
    bot.loadPlugin(pathfinder);
    
    bot.on('spawn', () => console.log(`${username} sunucuya bağlandı!`));
    bot.on('error', (err) => console.log(`[HATA] ${username}: ${err}`));
}

module.exports = { createBot };
