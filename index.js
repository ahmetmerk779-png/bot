const { Client, IntentsBitField } = require('discord.js');
const mineflayer = require('mineflayer');

// --- AYARLAR ---
const TOKEN = 'BURAYA_BOT_TOKEN_YAZ';
const KANAL_ID = 'BURAYA_KANAL_ID_YAZ';
// ---------------

const client = new Client({ intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent] });

let bot;

function baglan() {
    bot = mineflayer.createBot({
        host: 'play.aesirmc.com',
        username: 'MasterBot',
        version: '1.16.5', // AesirMC uyumlu sürüm
        auth: 'offline'
    });

    bot.on('spawn', () => {
        const c = client.channels.cache.get(KANAL_ID);
        if(c) c.send("✅ **AesirMC Lobisindeyim!** ASMP'ye girmek için `.asmp` yaz.");
    });

    // Chat'i Discord'a aktar
    bot.on('chat', (u, m) => {
        const c = client.channels.cache.get(KANAL_ID);
        if(c) c.send(`**[${u}]**: ${m}`);
    });
}

client.on('messageCreate', (msg) => {
    if (msg.author.bot || msg.channel.id !== KANAL_ID) return;

    // OTOMATİK MENÜ GEÇİŞİ
    if (msg.content === '.asmp') {
        msg.reply("🔄 Menü açılıyor, ASMP seçiliyor...");
        bot.chat('/menu');
        
        bot.once('windowOpen', (window) => {
            // AesirMC'de ASMP genelde 0. slotta olur
            bot.clickWindow(0, 0, 0); 
            msg.reply("🚀 ASMP Seçildi! Giriş yapıldı.");
        });
    }

    // Oyuna Mesaj Atma
    if (msg.content.startsWith('.yaz ')) {
        bot.chat(msg.content.slice(5));
    }
});

client.login(TOKEN);
baglan();
