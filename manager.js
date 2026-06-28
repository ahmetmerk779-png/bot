const { createBot } = require('./bot-logic');
const swarm = [
    { name: 'Maden_Botu', role: 'miner' },
    { name: 'Koruma_Botu', role: 'guard' }
];
swarm.forEach(b => createBot(b.name, b.role));
console.log("Sistem Aktif.");
