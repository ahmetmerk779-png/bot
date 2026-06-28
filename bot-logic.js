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
    
    bot.on('spawn', () => console.log(`${username} sunucuya girdi!`));
    bot.on('error', (err) => console.log(`[HATA] ${username}: ${err}`));
    bot.on('kicked', (reason) => console.log(`${username} atıldı: ${reason}`));
}

module.exports = { createBot };
