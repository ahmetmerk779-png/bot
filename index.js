const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const askGPT = require('./ai/gpt');
const createModule = require('./ai/moduleGenerator');
const agentLoop = require('./ai/agent');
const selfRepair = require('./ai/selfRepair');
const loadModules = require('./modules/loader');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

let bot;
let config = { 
    host: 'oyna.aesirmc.com', 
    username: 'myshoue', 
    version: '1.21.11' // Senin belirttiğin özel sürüm
};

function createBot() {
    if (bot) bot.quit();
    
    // Botu Oluştur
    bot = mineflayer.createBot(config);

    bot.on('spawn', () => {
        console.log("🚀 Bot sunucuya giriş yaptı!");
        io.emit('msg', { username: 'SİSTEM', message: '✅ Bot bağlandı. Modüller yükleniyor...' });
        
        // Sistemleri Başlat
        loadModules(bot); 
        agentLoop(bot);   
        
        // Canlı Veri Döngüsü (Radar & Envanter)
        setInterval(() => {
            if(!bot.entity) return;
            const items = bot.inventory.items().map(i => i.displayName);
            const players = Object.values(bot.entities)
                .filter(e => e.type === 'player' && e.username !== bot.username)
                .map(p => ({ 
                    name: p.username, 
                    dist: Math.round(bot.entity.position.distanceTo(p.position)) 
                }));
            io.emit('update', { items, players });
        }, 2000);
    });

    // Sohbet ve AI Komut İşleyici
    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;
        io.emit('msg', { username, message });

        // "bot yeni özellik ..." komutunu yakala
        if (message.startsWith('bot yeni özellik')) {
            const task = message.replace('bot yeni özellik', '');
            io.emit('msg', { username: 'AGENT', message: '🛠️ Yeni kod yazılıyor, lütfen bekleyin...' });
            
            const file = await createModule(task);
            if (file) {
                io.emit('msg', { username: 'AGENT', message: `✅ Yeni modül aktif edildi: ${file}` });
                loadModules(bot); // Yeni kodu anında sisteme dahil et
            }
        } 
        // İsmi geçtiğinde GPT ile cevap ver
        else if (message.toLowerCase().includes(bot.username.toLowerCase())) {
            const reply = await askGPT(message);
            if (reply) bot.chat(reply);
        }
    });

    // Hata ve Atılma Yönetimi (Self-Repair)
    bot.on('error', (err) => {
        console.log("Hata:", err.message);
        selfRepair(err.message, bot);
    });

    bot.on('kicked', (reason) => {
        console.log("Atıldı:", reason);
        io.emit('msg', { username: 'SİSTEM', message: `❌ Atıldı: ${reason}` });
        setTimeout(createBot, 5000); // 5 saniye sonra tekrar dene
    });

    bot.on('end', () => {
        io.emit('msg', { username: 'SİSTEM', message: '🔄 Bağlantı kesildi, yeniden deneniyor...' });
        setTimeout(createBot, 5000);
    });
}

// Web Panel Kontrolleri
io.on('connection', (socket) => {
    socket.on('command', (c) => {
        if(bot) bot.chat(c);
    });

    socket.on('move', (dir) => {
        if(!bot) return;
        bot.setControlState(dir, true);
        setTimeout(() => bot.setControlState(dir, false), 1000);
    });

    socket.on('go_asmp', () => {
        // ASMP Giriş Mantığı
        const star = bot.inventory.items().find(i => i.name.includes('star'));
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
        } else {
            io.emit('msg', { username: 'SİSTEM', message: '❌ Envanterde Nether Yıldızı bulunamadı!' });
        }
    });
});

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

server.listen(port, () => {
    console.log(`Panel http://localhost:${port} adresinde hazır.`);
    createBot();
});
