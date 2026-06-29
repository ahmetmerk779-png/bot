const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: true }));

let bot = null;
let botConfig = { name: 'Bot', host: 'aesirmc.com', port: 25565, pass: '' };
let status = "Beklemede...";

// --- BOT İŞLEMLERİ ---
function startBot() {
    status = "Bağlanılıyor...";
    bot = mineflayer.createBot({
        host: botConfig.host,
        port: parseInt(botConfig.port),
        username: botConfig.name,
        version: '1.21.1'
    });

    bot.loadPlugin(pathfinder);

    bot.on('login', () => {
        status = "🟢 ONLINE";
        if (botConfig.pass) {
            setTimeout(() => bot.chat('/login ' + botConfig.pass), 2000);
        }
    });

    bot.on('end', () => {
        status = "🔴 DÜŞTÜ - 10sn sonra bağlanılıyor...";
        setTimeout(startBot, 10000);
    });

    bot.on('chat', (username, message) => {
        if (username === bot.username) return;
        
        // !npc komutu (Chat üzerinden)
        if (message.startsWith('!npc ')) {
            const npcName = message.split('!npc ')[1];
            const npc = Object.values(bot.entities).find(e => 
                e.type === 'player' && e.username.toLowerCase().includes(npcName.toLowerCase())
            );
            if (npc) {
                bot.lookAt(npc.position.offset(0, npc.height / 2, 0));
                bot.activateEntity(npc);
                bot.chat(`${npc.username} NPC'sine tıklandı.`);
            } else {
                bot.chat("NPC bulunamadı.");
            }
        }
    });
}

// --- WEB PANELİ (KONSOL) ---
app.get('/', (req, res) => {
    res.send(`
        <h3>Bot Kontrol Merkezi</h3>
        <p>Durum: <b>${status}</b></p>
        <form action="/start" method="POST">
            <input name="name" value="${botConfig.name}" placeholder="Bot İsmi">
            <input name="pass" placeholder="Şifre">
            <button type="submit">Botu Başlat</button>
        </form>
        <hr>
        <form action="/run" method="POST">
            <input name="cmd" placeholder="Komut (örn: /warp)" required>
            <button type="submit">Komut Gönder</button>
        </form>
        <p>Chatten komut: <b>!npc [isim]</b></p>
    `);
});

app.post('/start', (req, res) => {
    botConfig.name = req.body.name;
    botConfig.pass = req.body.pass;
    if (bot) bot.quit();
    startBot();
    res.redirect('/');
});

app.post('/run', (req, res) => {
    if (bot) bot.chat(req.body.cmd);
    res.redirect('/');
});

app.listen(process.env.PORT || 3000, () => console.log("Web Paneli Aktif!"));
