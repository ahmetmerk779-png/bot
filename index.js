const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const mineflayer = require('mineflayer');

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    let bot;

    socket.on('launch', (cfg) => {
        if(bot) bot.quit();
        bot = mineflayer.createBot({
            host: cfg.ip, username: cfg.name || "Master", version: "1.16.5", auth: 'offline'
        });

        bot.on('spawn', () => {
            socket.emit('log', '>> [✅] Sunucuya Bağlanıldı.');
            
            // Canlı Radar & Durum Verisi
            setInterval(() => {
                if(!bot.entity) return;
                socket.emit('update', {
                    hp: Math.round(bot.health),
                    food: Math.round(bot.food),
                    pos: { x: Math.round(bot.entity.position.x), y: Math.round(bot.entity.position.y), z: Math.round(bot.entity.position.z) },
                    players: Object.values(bot.players).map(p => p.username)
                });
            }, 1000);
        });

        // ChatCraft'taki gibi GUI (Menü) yakalama
        bot.on('windowOpen', (window) => {
            const items = window.slots.map((item, i) => ({
                slot: i,
                name: item ? item.displayName : 'Boş',
                count: item ? item.count : 0
            }));
            socket.emit('open-gui', { title: window.title, items });
        });

        bot.on('chat', (u, m) => socket.emit('msg', {u, m}));
    });

    // Menüdeki eşyaya tıklama
    socket.on('gui-click', (slot) => { if(bot && bot.currentWindow) bot.clickWindow(slot, 0, 0); });
    socket.on('cmd', (d) => { if(bot) bot.setControlState(d.dir, d.state); });
    socket.on('send', (m) => { if(bot) bot.chat(m); });
});

server.listen(process.env.PORT || 3000);
