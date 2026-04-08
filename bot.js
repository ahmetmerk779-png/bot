const mineflayer = require('mineflayer');
const express = require('express');

// Render'ın uyumaması için web sunucusu
const app = express();
app.get('/', (req, res) => res.send('Bot Kayıtlı ve Aktif!'));
app.listen(process.env.PORT || 3000);

// DASHBOARD'DAN (Environment) BİLGİLERİ ÇEKER
const botAyarlari = {
    host: process.env.IP || 'play.sunucu.com', 
    port: parseInt(process.env.PORT_MC) || 25565,
    username: process.env.ISIM || 'Mahmutcan_Bot',
    version: process.env.SURUM || '1.20.1',
    auth: 'offline'
};

function botuBaslat() {
    const bot = mineflayer.createBot(botAyarlari);

    bot.on('spawn', () => {
        console.log(`[BAŞARILI] Bot şu sunucuya bağlandı: ${botAyarlari.host}`);
        
        // Dashboard'da SIFRE diye bir değişken varsa otomatik login yapar
        if (process.env.SIFRE) {
            setTimeout(() => {
                bot.chat(`/login ${process.env.SIFRE}`);
                bot.chat(`/register ${process.env.SIFRE} ${process.env.SIFRE}`);
            }, 2000);
        }
    });

    // --- ÖLÜRSE DOĞ (AUTO RESPAWN) ---
    bot.on('death', () => bot.respawn());

    // --- DÜŞERSE BAĞLAN (AUTO RECONNECT) ---
    bot.on('end', (reason) => {
        console.log(`[UYARI] Bağlantı koptu (${reason}), 10 saniye sonra tekrar giriliyor...`);
        setTimeout(botuBaslat, 10000);
    });

    // --- ANTI-AFK ---
    setInterval(() => {
        if (bot.entity) {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 500);
            bot.look(bot.entity.yaw + 0.1, bot.entity.pitch);
        }
    }, 25000);

    // --- HATALARI KONSOLA YAZ ---
    bot.on('error', (err) => console.log('Hata:', err.message));
    bot.on('message', (msg) => console.log(`> ${msg.toString()}`));
}

botuBaslat();
