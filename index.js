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

// --- 1. GUI & API Köprüsü (Render için zorunlu) ---
const app = express();
app.get('/', (req, res) => res.send('God Mode Engine Online'));
app.listen(process.env.PORT || 8080);

// --- 2. Düzeltilmiş Radar Sistemi ---
setInterval(() => {
    // Tüm varlıkları tara ve sadece oyuncuları filtrele
    const players = Object.values(bot.entities).filter(e => 
        e.type === 'player' && e.username !== bot.username
    );
    
    players.forEach(p => {
        const dist = bot.entity.position.distanceTo(p.position);
        if (dist < 30) {
            console.log(`[Radar]: Tespit edildi -> ${p.username} (${Math.round(dist)} blok)`);
        }
    });
}, 10000); // 10 saniyede bir tara

// --- 3. Akıllı Giriş ---
bot.on('message', (jsonMsg) => {
    const msg = jsonMsg.toString();
    if (msg.includes("login")) {
        bot.chat(`/login ${process.env.PASSWORD}`);
    }
});

// --- 4. Hata Yönetimi ---
bot.on('kicked', (reason) => {
    console.log(`[Rejoin]: Atıldım, 60s bekleniyor. Sebep: ${reason}`);
    setTimeout(() => bot.connect(), 60000);
});
bot.on('error', (err) => console.log('Hata:', err));

console.log("[Sistem]: God Mode Engine yüklendi ve hazır.");
