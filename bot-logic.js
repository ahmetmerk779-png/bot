const mineflayer = require('mineflayer');
const { pathfinder, goals, Movements } = require('mineflayer-pathfinder');
const { getDecision } = require('./ai-brain');

function createBot(username, role) {
    const bot = mineflayer.createBot({ host: 'localhost', username, version: '1.21.1' });
    bot.loadPlugin(pathfinder);
    
    bot.on('spawn', () => bot.chat(`Sisteme bağlandım. Rol: ${role}`));

    // Sürekli Zeka Döngüsü
    bot.on('physicTick', async () => {
        // Hayatta kalma içgüdüsü
        if (bot.food < 10) { /* Yemek yeme mantığı */ }

        // AI Karar Döngüsü (Her 10 saniyede bir)
        if (bot.time.age % 200 === 0) {
            const status = { health: bot.health, pos: bot.entity.position };
            const decision = await getDecision(username, status, "Hayatta kal ve güçlen");
            
            if(decision.action === 'move') { /* Hareket kodu */ }
        }
    });

    // Sürü İletişimi (Diğer botlardan gelen mesajları dinle)
    bot.on('whisper', (user, message) => {
        if (message.includes('YARDIM')) bot.chat("Geliyorum!");
    });
}

module.exports = { createBot };
