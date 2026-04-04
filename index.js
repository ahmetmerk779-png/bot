const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

let bot;
let config = {
    host: 'oyna.aesirmc.com',
    username: 'Bot_Hesap_Adi',
    version: '1.21.11'
};

function createBot() {
    if (bot) bot.quit();
    bot = mineflayer.createBot(config);

    bot.on('login', () => console.log("Bot Giriş Yaptı!"));
    bot.on('end', () => setTimeout(createBot, 5000));
    
    bot.on('spawn', () => {
        io.emit('status', 'Bağlı ✅');
        // Envanter ve Radar döngüsü
        setInterval(() => {
            if(!bot.entity) return;
            const items = bot.inventory.items().map(i => `${i.displayName} x${i.count}`);
            const players = Object.values(bot.entities)
                .filter(e => e.type === 'player' && e.username !== bot.username)
                .map(p => ({ name: p.username, dist: Math.round(bot.entity.position.distanceTo(p.position)) }));
            io.emit('update', { items, players });
        }, 3000);
    });

    bot.on('chat', (username, message) => io.emit('msg', { username, message }));
}

io.on('connection', (socket) => {
    // Ayarları Güncelle ve Yeniden Bağlan
    socket.on('update_config', (data) => {
        config = { ...config, ...data };
        createBot();
    });

    socket.on('command', (cmd) => bot.chat(cmd));
    
    // Hareket Kontrolü
    socket.on('move', (dir) => {
        bot.setControlState(dir, true);
        setTimeout(() => bot.setControlState(dir, false), 1000);
    });

    socket.on('go_asmp', () => {
        const star = bot.inventory.items().find(i => i.name.includes('nether_star'));
        if (star) {
            bot.equip(star, 'hand', () => {
                bot.activateItem();
                setTimeout(() => {
                    const win = bot.currentWindow;
                    if (win) {
                        const asmp = win.items().find(i => i.displayName.toLowerCase().includes('asmp'));
                        if (asmp) bot.clickWindow(asmp.slot, 0, 0);
                    }
                }, 1500);
            });
        }
    });
});

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
server.listen(port, () => createBot());
