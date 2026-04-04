const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

const botOptions = {
    host: 'oyna.aesirmc.com',
    username: 'myshoue', // BURAYI DEĞİŞTİR
    version: '1.21.11',
    hideErrors: true
};

let bot;

function createBot() {
    bot = mineflayer.createBot(botOptions);

    bot.on('end', () => setTimeout(createBot, 5000));

    bot.on('spawn', () => {
        console.log("Bot giriş yaptı!");
        // Otomatik Giriş Komutu (Gerekliyse)
        bot.chat('/login ShoueShoue'); 
        
        // Anti-AFK
        setInterval(() => {
            if(bot.entity) {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 200);
            }
        }, 20000);
    });

    bot.on('chat', (username, message) => {
        io.emit('msg', { username, message });
        if (message.toLowerCase().includes('selam')) bot.chat('Aleyküm Selam!');
    });

    // Radar Verisi
    setInterval(() => {
        if (!bot.entities) return;
        const players = Object.values(bot.entities)
            .filter(e => e.type === 'player' && e.username !== bot.username)
            .map(p => ({ name: p.username, dist: Math.round(bot.entity.position.distanceTo(p.position)) }));
        io.emit('radar', players);
    }, 3000);
}

// ASMP Giriş (Nether Yıldızı -> ASMP İkonu)
function joinASMP() {
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
            }, 1200);
        });
    }
}

io.on('connection', (socket) => {
    socket.on('go_asmp', () => joinASMP());
    socket.on('send_chat', (msg) => bot.chat(msg));
});

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
server.listen(port, () => {
    console.log(`Panel hazır! Port: ${port}`);
    createBot();
});
