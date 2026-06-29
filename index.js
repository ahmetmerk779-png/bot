const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock');
const express = require('express');

const app = express();
app.use(express.urlencoded({ extended: true }));

const bots = new Map(); // Aktif botlar listesi

function createBot(username, host, port, autoCommands) {
    const bot = mineflayer.createBot({ host, port: parseInt(port), username, version: '1.21.1' });
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(collectBlock);

    bots.set(username, bot);

    bot.on('login', () => {
        console.log(`${username} sunucuya girdi!`);
        // Otomatik komutları bekle ve çalıştır
        if (autoCommands) {
            const cmds = autoCommands.split(',');
            cmds.forEach((cmd, i) => {
                setTimeout(() => bot.chat(cmd.trim()), i * 1500); // 1.5 saniye arayla
            });
        }
    });

    bot.on('end', () => bots.delete(username));
    return bot;
}

// WEB PANELİ
app.get('/', (req, res) => {
    let botListHtml = '';
    bots.forEach((bot, name) => {
        botListHtml += `
            <div style="border:1px solid #ccc; padding:10px; margin:5px;">
                <strong>${name}</strong> aktif. 
                <form action="/run" method="POST" style="display:inline">
                    <input type="hidden" name="name" value="${name}">
                    <input name="cmd" placeholder="Komut yaz (örn: /warp)" required>
                    <button type="submit">Gönder</button>
                </form>
                <form action="/quit" method="POST" style="display:inline">
                    <input type="hidden" name="name" value="${name}">
                    <button>Kapat</button>
                </form>
            </div>`;
    });

    res.send(`
        <h3>AesirMC Bot Kontrol Merkezi</h3>
        <form action="/spawn" method="POST">
            <input name="name" placeholder="Bot İsmi" required>
            <input name="ip" placeholder="Server IP" value="aesirmc.com" required>
            <input name="port" value="25565" required>
            <input name="auto" placeholder="Oto Komutlar (virgülle ayır: /login 123, /kit)" style="width:300px">
            <button type="submit">Botu Sok</button>
        </form>
        <hr>
        ${botListHtml || 'Şu an aktif bot yok.'}
    `);
});

// Bot Spawn
app.post('/spawn', (req, res) => {
    createBot(req.body.name, req.body.ip, req.body.port, req.body.auto);
    res.redirect('/');
});

// Komut Gönder
app.post('/run', (req, res) => {
    const bot = bots.get(req.body.name);
    if (bot) bot.chat(req.body.cmd);
    res.redirect('/');
});

// Bot Kapat
app.post('/quit', (req, res) => {
    const bot = bots.get(req.body.name);
    if (bot) bot.quit();
    res.redirect('/');
});

app.listen(process.env.PORT || 3000);
