const { createBot } = require('./bot-logic');
require('dotenv').config();

const swarm = [
    { name: 'Maden_Botu', role: 'miner' },
    { name: 'Koruma_Botu', role: 'guard' },
    { name: 'Depo_Botu', role: 'logistic' }
];

swarm.forEach(botConfig => {
    console.log(`[MANAGER] Başlatılıyor: ${botConfig.name}`);
    createBot(botConfig.name, botConfig.role);
});
