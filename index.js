const express = require('express');
const { Client, IntentsBitField } = require('discord.js');
const mineflayer = require('mineflayer');

// --- RENDER UYANIK TUTMA (KEEP-ALIVE) ---
const app = express();
app.get('/', (req, res) => res.send('<h1>🤖 MasterBot Aktif!</h1><p>Discord üzerinden komut gönderebilirsin.</p>'));
app.listen(process.env.PORT || 3000);

// --- AYARLAR (BURALARI DOLDUR) ---
const TOKEN = 'BURAYA_DISCORD_BOT_TOKEN_YAZ';
const KANAL_ID = 'BURAYA_KANAL_ID_YAZ';
// ---------------------------------

const client = new Client({ 
    intents: [
        IntentsBitField.Flags.Guilds, 
        IntentsBitField.Flags.GuildMessages, 
        IntentsBitField.Flags.MessageContent
    ] 
});

let bot;

function baglan() {
    bot = mineflayer.createBot({
        host: 'play.aesirmc.com',
        username: 'MasterBot', // Oyun içi adın
        version: '1.16.5',
        auth: 'offline'
    });

    bot.on('spawn', () => {
        const c = client.channels.cache.get(KANAL_ID);
        if(c) c.send("✅ **Bot Lobiye Girdi!** ASMP'ye girmek için `.asmp` yaz.");
    });

    // Oyundaki Chat'i Discord'a Aktar
    bot.on('chat', (u, m) => {
        const c = client.channels.cache.get(KANAL_ID);
        if(c) c.send(`**[${u}]**: ${m}`);
    });

    // Hata Olursa Yeniden Bağlan
    bot.on('error', (err) => console.log('Hata:', err));
    bot.on('end', () => setTimeout(baglan, 5000));
}

client.on('messageCreate', (msg) => {
    if (msg.author.bot || msg.channel.id !== KANAL_ID) return;

    // OTOMATİK MENÜ GEÇİŞİ
    if (msg.content === '.asmp') {
        msg.reply("🔄 AesirMC Menüsü açılıyor, ASMP seçiliyor...");
        bot.chat('/menu');
        
        bot.once('windowOpen', (window) => {
            // AesirMC'de ASMP genellikle ilk slotta (0) olur.
            bot.clickWindow(0, 0, 0); 
            msg.reply("🚀 ASMP'ye giriş yapıldı!");
        });
    }

    // Discord'dan Oyuna Mesaj Yazma
    if (msg.content.startsWith('.yaz ')) {
        bot.chat(msg.content.slice(5));
    }
});

client.login(TOKEN);
baglan();
