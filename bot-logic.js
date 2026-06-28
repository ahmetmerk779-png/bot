const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');

function createBot(username, host, port) {
    const bot = mineflayer.createBot({ 
        host: host,
        port: parseInt(port),
        username: username, 
        version: '1.21.1' 
    });
    
    bot.loadPlugin(pathfinder);
    
    bot.on('spawn', () => {
        console.log(`${username} sunucuya girdi!`);
        bot.chat("Selam, ben geldim!"); // Oyuna girince selam verir
    });

    // BURASI ÇOK ÖNEMLİ: Chat'i dinleyen kısım
    bot.on('chat', (username, message) => {
        if (username === bot.username) return; // Kendi mesajına cevap vermesin

        if (message.toLowerCase().includes('merhaba')) {
            bot.chat(`Selam ${username}, nasılsın?`);
        }
    });
    
    bot.on('error', (err) => console.log(`[HATA] ${username}: ${err}`));
    bot.on('kicked', (reason) => console.log(`${username} atıldı: ${reason}`));
}

module.exports = { createBot };
