const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const mineflayer = require('mineflayer');

app.use(express.static(__dirname));

// Örnek sunucu listesi (Resim 1000264944'teki gibi)
const servers = [
    { name: 'IZTECHMC', ip: 'play.iztechmc.com.tr', ver: '1.20.1', desc: 'SAKURA SMP | LANDCLAIM' },
    { name: 'aesirmc', ip: 'play.aesirmc.com', ver: '1.16.5', desc: 'MMO FACTION YENİ SEZON!' }
];

io.on('connection', (socket) => {
    // Ana sayfaya sunucu listesini gönder
    socket.emit('server-list', servers);

    let bot;
    socket.on('launch', (cfg) => {
        if(bot) { try { bot.quit(); } catch(e){} }
        bot = mineflayer.createBot({ 
            host: cfg.ip, 
            username: cfg.name || "Master", 
            version: cfg.ver || "1.16.5", 
            auth: 'offline' 
        });

        bot.on('spawn', () => {
            socket.emit('sys-msg', '✅ ' + cfg.ip + ' adresine bağlanıldı!');
            setInterval(() => {
                if(!bot || !bot.entity) return;
                socket.emit('status-update', {
                    hp: Math.round(bot.health),
                    pos: `X:${bot.entity.position.x.toFixed(2)} Y:${bot.entity.position.y.toFixed(2)} Z:${bot.entity.position.z.toFixed(2)}`,
                    players: Object.values(bot.players).map(p => p.username)
                });
            }, 1000);
        });

        bot.on('chat', (username, message) => {
            socket.emit('new-msg', { u: username, m: message });
        });

        bot.on('kicked', (reason) => socket.emit('sys-msg', '❌ Atıldın: ' + reason));
        bot.on('error', (err) => socket.emit('sys-msg', '⚠️ Hata: ' + err.message));
    });

    socket.on('send-chat', (msg) => { if(bot) bot.chat(msg); });
});

server.listen(process.env.PORT || 3000);
