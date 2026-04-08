const mineflayer = require('mineflayer');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// --- BOTUN HAFIZASI (AYARLAR) ---
let ayarlar = {
    ip: 'play.sunucuadresi.com',
    isim: 'Mahmutcan_Bot',
    surum: '1.20.1',
    sifre: ''
};

let bot;
let logs = [];

// --- WEB PANELİ ARAYÜZÜ ---
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head><title>MC Bot Panel</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="background:#1a1a1a; color:white; font-family:sans-serif; text-align:center; padding:20px;">
            <h2 style="color:#00ff00;">🤖 Minecraft Bot Paneli</h2>
            
            <form action="/update" method="POST" style="background:#2a2a2a; padding:15px; border-radius:10px; display:inline-block; text-align:left;">
                <label>Sunucu IP:</label><br>
                <input type="text" name="ip" value="${ayarlar.ip}" style="width:100%; margin-bottom:10px;"><br>
                <label>Bot İsmi:</label><br>
                <input type="text" name="isim" value="${ayarlar.isim}" style="width:100%; margin-bottom:10px;"><br>
                <label>Sürüm:</label><br>
                <input type="text" name="surum" value="${ayarlar.surum}" style="width:100%; margin-bottom:10px;"><br>
                <label>Şifre (Opsiyonel):</label><br>
                <input type="text" name="sifre" value="${ayarlar.sifre}" style="width:100%; margin-bottom:10px;"><br>
                <button type="submit" style="background:#00ff00; border:none; padding:10px; width:100%; cursor:pointer; font-weight:bold;">AYARLARI KAYDET VE YENİDEN BAŞLAT</button>
            </form>

            <div style="margin-top:20px;">
                <h3>Canlı Konsol</h3>
                <div id="logs" style="background:black; color:#0f0; padding:10px; height:200px; overflow-y:scroll; text-align:left; font-family:monospace; font-size:12px; border:1px solid #444;">
                    ${logs.join('<br>')}
                </div>
            </div>
            <script>setInterval(() => { location.reload(); }, 10000);</script>
        </body>
        </html>
    `);
});

// --- PANELDE KAYDETE BASINCA ÇALIŞAN KISIM ---
app.post('/update', (req, res) => {
    ayarlar = {
        ip: req.body.ip,
        isim: req.body.isim,
        surum: req.body.surum,
        sifre: req.body.sifre
    };
    logs.push("[SİSTEM] Ayarlar güncellendi, bot yeniden başlatılıyor...");
    if (bot) bot.quit();
    botuBaslat();
    res.redirect('/');
});

app.listen(process.env.PORT || 3000);

// --- MINEFLAYER BOT MANTIĞI ---
function botuBaslat() {
    bot = mineflayer.createBot({
        host: ayarlar.ip,
        username: ayarlar.isim,
        version: ayarlar.surum,
        auth: 'offline'
    });

    bot.on('spawn', () => {
        logs.push(`[BAĞLANDI] Sunucu: ${ayarlar.ip}`);
        if (ayarlar.sifre) bot.chat(`/login ${ayarlar.sifre}`);
    });

    bot.on('message', (msg) => {
        logs.push(`> ${msg.toString()}`);
        if (logs.length > 50) logs.shift(); // Hafızayı boşalt
    });

    bot.on('death', () => bot.respawn());
    
    bot.on('end', () => {
        logs.push("[UYARI] Bağlantı kesildi, 5sn sonra denenecek.");
        setTimeout(botuBaslat, 5000);
    });

    bot.on('error', (err) => logs.push(`[HATA] ${err.message}`));
}

botuBaslat();
