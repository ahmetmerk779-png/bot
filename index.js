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
        bot = mineflayer.createBot({ host: cfg.ip, username: cfg.name || "Master", version: "1.16.5", auth: 'offline' });

        bot.on('spawn', () => {
            socket.emit('msg', {u: 'SİSTEM', m: '✅ BAĞLANTI KURULDU!'});
            setInterval(() => {
                if(!bot || !bot.entity) return;
                socket.emit('st', {
                    hp: Math.round(bot.health),
                    pos: {x:Math.round(bot.entity.position.x), y:Math.round(bot.entity.position.y), z:Math.round(bot.entity.position.z)},
                    yaw: bot.entity.yaw,
                    players: Object.values(bot.entities).filter(e => e.type==='player' && e!==bot.entity).map(e => ({x:e.position.x-bot.entity.position.x, z:e.position.z-bot.entity.position.z}))
                });
            }, 1200);
        });

        bot.on('chat', (u, m) => socket.emit('msg', {u, m}));
        bot.on('kicked', (r) => socket.emit('msg', {u: 'SİSTEM', m: 'Atıldın: ' + r}));
        bot.on('error', (e) => socket.emit('msg', {u: 'HATA', m: e.message}));
    });

    socket.on('send', (m) => { if(bot) bot.chat(m); });
    socket.on('cmd', (c) => { if(bot) bot.setControlState(c.d, c.s); });
});

server.listen(process.env.PORT || 3000);
