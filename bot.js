const mineflayer = require('mineflayer');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

// Botun durumunu saklamak için bir obje
let botDurum = {
    durum: "Başlatılıyor...",
    can: 0,
    aclik: 0,
    konum: "Bilinmiyor",
    sunucu: process.env.IP || 'Ayarlanmadı'
};

// --- CANLI PANEL SAYFASI ---
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family:sans-serif; background:#121212; color:white; padding:20px; border-radius:10px; width:300px;">
            <h2 style="color:#00ff00;">MC Bot Kontrol Paneli</h2>
            <hr>
            <p><b>Durum:</b> ${botDurum.durum}</p>
            <p><b>Sunucu:</b> ${botDurum.sunucu}</p>
            <p><b>Bot İsmi:</b> ${process.env.ISIM || 'AFK_Bot'}</p>
            <p><b>Can:</b> ❤️ %${botDurum.can * 5}</p>
            <p><b>Açlık:</b> 🍖 ${botDurum.aclik}</p>
            <p><b>Konum:</b> ${botDurum.konum}</p>
            <button onclick="location.reload()" style="background:#00ff00; border:none; padding:10px; cursor:pointer; border-radius:5px;">Yenile</button>
        </div>
    `);
});

app.listen(port);

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
        botDurum.durum = "Sunucuda AFK";
        console.log(`[BAŞARILI] Bot bağlandı.`);
        if (process.env.SIFRE) bot.chat(`/login ${process.env.SIFRE}`);
    });

    // Her 2 saniyede bir panel verilerini güncelle
    setInterval(() => {
        if (bot.entity) {
            botDurum.can = Math.round(bot.health);
            botDurum.aclik = Math.round(bot.food);
            botDurum.konum = `X: ${Math.round(bot.entity.position.x)} Y: ${Math.round(bot.entity.position.y)}`;
        }
    }, 2000);

    bot.on('death', () => {
        botDurum.durum = "Öldü (Doğuyor...)";
        bot.respawn();
    });

    bot.on('end', (reason) => {
        botDurum.durum = "Bağlantı Koptu!";
        setTimeout(botuBaslat, 10000);
    });

    // Anti-AFK
    setInterval(() => {
        if (bot.entity) {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 500);
        }
    }, 25000);

    bot.on('error', (err) => console.log('Hata:', err.message));
}

botuBaslat();
