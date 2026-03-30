const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const mineflayer = require('mineflayer');
const path = require('path');

// Hata önleyici içe aktarma
let viewer;
try {
    viewer = require('prismarine-viewer').mineflayer;
} catch (e) {
    console.log("Viewer yuklenirken hata olustu, gorsel devre disi.");
}

const PORT = process.env.PORT || 3000;
let bot = null;

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    socket.on('launch-bot', (cfg) => {
        if(bot) { try { bot.quit(); } catch(e) {} }
        
        bot = mineflayer.createBot({
            host: cfg.ip,
            username: cfg.name || "MasterBot",
            version: cfg.version || "1.16.5",
            auth: 'offline'
        });

        bot.on('spawn', () => {
            socket.emit('log', `>> [✅] BOT AKTIF!`);
            
            // Eğer kütüphane bulunduysa yayını başlat
            if(viewer && bot) {
                try {
                    viewer(bot, { port: 3007, firstPerson: true });
                    socket.emit('log', `>> [📺] Goruntu motoru 3007 portunda hazir.`);
                } catch(e) {
                    socket.emit('log', `!! Goruntu motoru baslatilamadi.`);
                }
            }
        });

        bot.on('chat', (u, m) => socket.emit('log', `<${u}> ${m}`));
        bot.on('error', (err) => socket.emit('log', `!! Hata: ${err.message}`));
    });

    socket.on('move', (d) => { if(bot) bot.setControlState(d.dir, d.state); });
    socket.on('send-chat', (m) => { if(bot) bot.chat(m); });
});

server.listen(PORT, '0.0.0.0', () => console.log(`Sunucu aktif: ${PORT}`));
