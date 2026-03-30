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
            socket.emit('log', `>> [✅] TERMINAL AKTIF!`);
            viewer(bot, { port: 3001, firstPerson: true });
            
            // Canlı Envanter Verisi
            setInterval(() => {
                if(bot.inventory) {
                    const items = bot.inventory.slots.map((item, index) => ({
                        slot: index,
                        name: item ? item.name : 'empty',
                        count: item ? item.count : 0
                    }));
                    socket.emit('inv-full', items);
                }
            }, 1000);
        });
    });

    // FİZİKSEL KONTROLLER
    socket.on('move', (dir, state) => { if(bot) bot.setControlState(dir, state); });
    socket.on('jump', (state) => { if(bot) bot.setControlState('jump', state); });
    socket.on('attack', () => { if(bot) bot.attack(bot.nearestEntity()); });
    
    // ENVANTER KONTROLÜ (Eşya Seçme/Atma)
    socket.on('select-slot', (slot) => { if(bot) bot.setQuickBarSlot(slot); });
    socket.on('drop-item', () => { if(bot) bot.tossStack(bot.heldItem); });
});

server.listen(PORT, '0.0.0.0', () => console.log(`Master Core Terminal Aktif!`));
