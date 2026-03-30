const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const mineflayer = require('mineflayer');

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
            socket.emit('log', `>> [✅] SİSTEM AKTİF! Canvas hatası bypass edildi.`);
            
            // Veri Akışı (Görüntü yerine canlı veri paneli)
            setInterval(() => {
                if(bot && bot.entity) {
                    const data = {
                        pos: { x: Math.round(bot.entity.position.x), y: Math.round(bot.entity.position.y), z: Math.round(bot.entity.position.z) },
                        hp: Math.round(bot.health),
                        food: Math.round(bot.food),
                        near: Object.values(bot.entities)
                            .filter(e => e.type === 'player' && e.username !== bot.username)
                            .map(e => e.username)
                    };
                    socket.emit('bot-stats', data);
                }
            }, 1000);
        });

        bot.on('chat', (u, m) => socket.emit('log', `<b style="color:#8e44ad">${u}</b>: ${m}`));
        bot.on('error', (err) => socket.emit('log', `!! HATA: ${err.message}`));
    });

    socket.on('move', (d) => { if(bot) bot.setControlState(d.dir, d.state); });
    socket.on('send-chat', (m) => { if(bot) bot.chat(m); });
});

server.listen(PORT, '0.0.0.0', () => console.log(`Aktif port: ${PORT}`));
