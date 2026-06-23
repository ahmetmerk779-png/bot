const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
require('dotenv').config();

const bot = mineflayer.createBot({
    host: 'aesirmc.com',
    port: 25565,
    username: 'asmp_bot',
    version: '1.21.8' // Versiyon seçimi
});

bot.loadPlugin(pathfinder);

// --- 1. Güvenli Giriş ve Restart Modülü ---
bot.on('message', (jsonMsg) => {
    const msg = jsonMsg.toString();
    console.log(`[Sunucu]: ${msg}`);
    if (msg.includes("Lütfen /login")) {
        bot.chat(`/login ${process.env.PASSWORD}`);
    }
});

// --- 2. AI Karar ve Kişilik Modülü ---
bot.on('spawn', () => {
    console.log("[AI]: Operatör, AesirMC dünyasına giriş yapıldı. Görev hazır.");
    bot.chat("God Mode aktif. Sistem analiz ediliyor...");
});

// --- 3. Pathfinding ve NPC Etkileşim ---
async function goToAndInteract(npcName) {
    const npc = bot.nearestEntity((e) => e.type === 'player' && e.username === npcName);
    if (npc) {
        const move = new Movements(bot);
        bot.pathfinder.setMovements(move);
        await bot.pathfinder.goto(new goals.GoalNear(npc.position.x, npc.position.y, npc.position.z, 2));
        bot.lookAt(npc.position.offset(0, npc.height / 2, 0));
        bot.activateEntity(npc);
    }
}

// --- 4. Radar Sistemi (Tetikleyici) ---
setInterval(() => {
    const entities = bot.nearestEntities(30);
    entities.forEach(e => {
        if (e.type === 'player') console.log(`[Radar]: Tespit edildi -> ${e.username}`);
    });
}, 5000);

// --- 5. Hata Yönetimi ---
bot.on('kicked', console.log);
bot.on('error', console.log);
