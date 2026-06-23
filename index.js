const mineflayer = require('mineflayer');
const express = require('express');
require('dotenv').config();

let botSettings = {
    host: 'aesirmc.com',
    username: 'asmp_bot',
    version: '1.21.8'
};

let bot;

function startBot() {
    bot = mineflayer.createBot({
        host: botSettings.host,
        username: botSettings.username,
        version: botSettings.version
    });

    bot.on('message', (jsonMsg) => {
        const msg = jsonMsg.toString();
        if (msg.includes("login")) bot.chat(`/login ${process.env.PASSWORD}`);
    });

    bot.on('spawn', () => console.log(`[AI]: Bot ${botSettings.host} üzerinde aktif.`));
    bot.on('error', (err) => console.log('Hata:', err));
}

const app = express();
app.use(express.json());
app.use(express.static('public')); // GUI burada çalışacak

app.post('/update-settings', (req, res) => {
    const { host, version } = req.body;
    if (host) botSettings.host = host;
    if (version) botSettings.version = version;

    if (bot) bot.quit();
    startBot();
    res.send({ status: 'Sistem güncellendi', settings: botSettings });
});

app.listen(process.env.PORT || 8080);
startBot();
