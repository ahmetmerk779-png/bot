const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');

function createBot(username, role) {
    const bot = mineflayer.createBot({ host: 'localhost', username, version: '1.21.1' });
    bot.loadPlugin(pathfinder);
    bot.on('spawn', () => console.log(`${username} hazır!`));
}
module.exports = { createBot };
