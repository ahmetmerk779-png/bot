const mineflayer = require('mineflayer');
const express = require('express');

// --- UPTIME ROBOT İÇİN GEREKLİ (DOKUNMA) ---
const app = express();
app.get('/', (req, res) => res.send('Bot Kaydedildi ve Aktif!'));
app.listen(process.env.PORT || 3000);

// --- DASHBOARD'DAN BİLGİLERİ OKUR ---
// Render Dashboard -> Environment sekmesindeki bilgileri çeker.
const botAyarlari = {
    host: process.env.IP,       // Dashboard'da IP kısmına yazdığın servera gider
    port: parseInt(process.env.PORT_MC) || 25565,
    username: process.env.ISIM, // Dashboard'da ISIM kısmına ne yazarsan o olur
    version: process.env.SURUM, // Dashboard'da SURUM kısmına ne yazarsan o olur
    auth: 'offline'
};

function botuBaslat() {
    // Eğer Dashboard boşsa botu başlatma, hata ver (Yanlış IP aramasın)
    if (!botAyarlari.host || !botAyarlari.username) {
        console.log("--------------------------------------------------");
        console.log("HATA: Render Dashboard'dan IP ve ISIM yazıp 'Save' yapmalısın!");
        console.log("--------------------------------------------------");
        return;
    }

    const bot = mineflayer.createBot(botAyarlari);

    bot.on('spawn', () => {
        console.log(`[KAYIT BAŞARILI] Bot ${botAyarlari.host} adresinde aktif!`);
        
        // Dashboard'da SIFRE varsa otomatik yazar
        if (process.env.SIFRE) {
            setTimeout(() => bot.chat(`/login ${process.env.SIFRE}`), 2000);
        }
    });

    // --- AUTO RESPAWN (Ölürse Doğ) ---
    bot.on('death', () => bot.respawn());

    // --- ANTI-AFK (Sunucudan Atılma) ---
    setInterval(() => {
        if (bot.entity) {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 500);
            bot.look(bot.entity.yaw + 0.1, bot.entity.pitch);
        }
    }, 20000);

    // --- AUTO RECONNECT (Düşerse Bağlan) ---
    bot.on('end', (reason) => {
        console.log(`Bağlantı koptu: ${reason}. 10sn sonra tekrar giriliyor...`);
        setTimeout(botuBaslat, 10000);
    });

    bot.on('error', (err) => console.log('Hata:', err.message));
}

botuBaslat();
