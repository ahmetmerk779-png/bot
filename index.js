const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const mineflayer = require('mineflayer');

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    let bot;
    socket.on('launch', (cfg) => {
        if(bot) { try { bot.quit(); } catch(e){} }
        bot = mineflayer.createBot({ host: cfg.ip, username: cfg.name || "MasterBot", version: "1.16.5", auth: 'offline' });

        bot.on('spawn', () => {
            socket.emit('sys', 'Sunucuya giriş yapıldı!');
            setInterval(() => {
                if(!bot || !bot.entity) return;
                socket.emit('st', {
                    hp: Math.round(bot.health),
                    pos: `X:${Math.round(bot.entity.position.x)} Y:${Math.round(bot.entity.position.y)} Z:${Math.round(bot.entity.position.z)}`,
                    yaw: bot.entity.yaw,
                    players: Object.values(bot.players).map(p => p.username),
                    inventory: bot.inventory.slots.filter(s => s).map(s => ({ name: s.displayName, count: s.count }))
                });
            }, 1000);
        });

        // ChatCraft gibi Menüleri (Resim 1000264950) yakalar
        bot.on('windowOpen', (w) => {
            const items = w.slots.filter(s => s).map(s => ({ slot: s.slot, name: s.displayName, count: s.count }));
            socket.emit('gui', { title: w.title, items });
        });

        bot.on('chat', (u, m) => socket.emit('msg', {u, m}));
        bot.on('error', (e) => socket.emit('sys', 'Hata: ' + e.message));
        bot.on('kicked', (r) => socket.emit('sys', 'Atıldın: ' + r));
    });

    socket.on('send', (m) => { if(bot) bot.chat(m); });
    socket.on('cmd', (c) => { if(bot) bot.setControlState(c.d, c.s); });
    socket.on('gui-click', (s) => { if(bot && bot.currentWindow) bot.clickWindow(s, 0, 0); });
});

server.listen(process.env.PORT || 3000);
