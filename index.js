const express = require('express'); // Hata veren kısım burasıydı, artık yüklü!
const { Client, IntentsBitField } = require('discord.js');
const mineflayer = require('mineflayer');

const app = express();
app.get('/', (req, res) => res.send('Bot Aktif!'));
app.listen(process.env.PORT || 3000);

const TOKEN = 'BURAYA_BOT_TOKEN_YAZ';
const KANAL_ID = 'BURAYA_KANAL_ID_YAZ';

const client = new Client({ intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent] });
let bot;

function baglan() {
    bot = mineflayer.createBot({
        host: 'play.aesirmc.com',
        username: 'MasterBot',
        version: '1.16.5',
        auth: 'offline'
    });

    bot.on('spawn', () => {
        const c = client.channels.cache.get(KANAL_ID);
        if(c) c.send("✅ **Bot Lobiye Girdi!** ASMP için `.asmp` yaz.");
    });

    bot.on('chat', (u, m) => {
        const c = client.channels.cache.get(KANAL_ID);
        if(c) c.send(`**[${u}]**: ${m}`);
    });
}

client.on('messageCreate', (msg) => {
    if (msg.author.bot || msg.channel.id !== KANAL_ID) return;

    if (msg.content === '.asmp') {
        msg.reply("🔄 ASMP Seçiliyor...");
        bot.chat('/menu');
        bot.once('windowOpen', (window) => {
            bot.clickWindow(0, 0, 0); 
            msg.reply("🚀 ASMP'ye girildi!");
        });
    }

    if (msg.content.startsWith('.yaz ')) {
        bot.chat(msg.content.slice(5));
    }
});

client.login(TOKEN);
baglan();
