const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');

function createBot(username, role) {
    const bot = mineflayer.createBot({ 
        host: process.env.SERVER_IP || 'localhost',
        port: parseInt(process.env.SERVER_PORT) || 25565,
        username: username, 
        version: '1.21.1' 
    });
    
    bot.loadPlugin(pathfinder);
    bot.on('spawn', () => console.log(`${username} sunucuya bağlandı!`));
    bot.on('error', (err) => console.log(`[HATA] ${username}: ${err}`));
}

module.exports = { createBot };
