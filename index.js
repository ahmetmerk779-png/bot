const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const express = require('express');
require('dotenv').config();

const bot = mineflayer.createBot({
    host: process.env.SERVER_HOST || 'aesirmc.com',
    port: 25565,
    username: 'asmp_bot',
    version: '1.21.8'
});

bot.loadPlugin(pathfinder);

// --- 1. GUI & API Köprüsü (8080 Portu) ---
const app = express();
app.use(express.json());
app.post('/command', (req, res) => {
    const { action } = req.body;
    if (action === 'STOP') bot.quit();
    if (action === 'REJOIN') bot.connect();
    res.send({ status: 'OK' });
});
app.listen(process.env.PORT || 8080);

// --- 2. Otonom Savunma ve Radar ---
bot.on('entityMoved', (entity) => {
    if (entity.type === 'player' && entity.username !== 'asmp_bot') {
        const dist = bot.entity.position.distanceTo(entity.position);
        if (dist < 10) {
            console.log(`[ALERT]: Yakın tehdit tespit edildi: ${entity.username}`);
            bot.chat(`[God Mode Defense]: ${entity.username} güvenli mesafeye çekil!`);
        }
    }
});

// --- 3. Akıllı Giriş ve Kişilik ---
bot.on('message', (jsonMsg) => {
    const msg = jsonMsg.toString();
    if (msg.includes("login")) bot.chat(`/login ${process.env.PASSWORD}`);
});

bot.on('spawn', () => {
    console.log("[AI]: Operatör, Sistem Online. Göreve hazırım.");
    bot.chat("God Mode Engine 2.0 aktif.");
});

// --- 4. NPC Etkileşim Motoru ---
async function interactWithNPC(npcName) {
    const npc = bot.nearestEntity((e) => e.type === 'player' && e.username === npcName);
    if (npc) {
        const move = new Movements(bot);
        bot.pathfinder.setMovements(move);
        await bot.pathfinder.goto(new goals.GoalNear(npc.position.x, npc.position.y, npc.position.z, 2));
        bot.lookAt(npc.position.offset(0, npc.height / 2, 0));
        bot.activateEntity(npc);
    }
}

// --- 5. Hata & Yeniden Bağlanma ---
bot.on('kicked', (reason) => {
    console.log(`[Rejoin]: Atıldım, 60s bekleniyor. Sebep: ${reason}`);
    setTimeout(() => bot.connect(), 60000);
});
bot.on('error', (err) => console.log(err));
