const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const mineflayer = require('mineflayer');
const { mineflayer: viewer } = require('prismarine-viewer');

const PORT = process.env.PORT || 3000;
let bot = null;

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    socket.on('launch-bot', (cfg) => {
        if(bot) bot.quit();
        bot = mineflayer.createBot({
            host: cfg.ip, username: cfg.name || "MasterBot", version: cfg.version, auth: 'offline'
        });

        bot.on('spawn', () => {
            socket.emit('log', `>> [✅]登 GİRİŞ YAPILDI! Görüntü Aktif.`);
            viewer(bot, { port: 3001, firstPerson: true }); // Canlı Görüntü Motoru
            
            // Envanter Güncelleme (GUI için)
            setInterval(() => {
                if(bot.inventory) {
                    const items = bot.inventory.items().map(i => ({ name: i.name, count: i.count, slot: i.slot }));
                    socket.emit('inv-data', items);
                }
            }, 2000);
        });

        bot.on('chat', (u, m) => socket.emit('log', `<${u}> ${m}`));
    });

    // HAREKET KONTROLÜ
    socket.on('move', (dir) => {
        if(!bot) return;
        const control = dir === 'forward' ? 'forward' : dir === 'back' ? 'back' : dir === 'left' ? 'left' : 'right';
        bot.setControlState(control, true);
        setTimeout(() => bot.setControlState(control, false), 500); // 0.5 saniye yürü
    });

    // ENVANTER / GUI ETKİLEŞİMİ (Eşya Atma/Kullanma)
    socket.on('use-item', (slot) => {
        if(bot) bot.activateItem(); // Eldeki eşyayı kullan
    });

    socket.on('send-chat', (m) => { if(bot) bot.chat(m); });
});

server.listen(PORT, '0.0.0.0', () => console.log(`Sistem Aktif!`));
