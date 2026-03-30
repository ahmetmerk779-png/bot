const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const mineflayer = require('mineflayer');
const path = require('path');

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    console.log('>> Komuta Merkezi Baglandi (Oppo)');

    socket.on('launch-bot', (cfg) => {
        socket.emit('log', `>> [🔄] ${cfg.ip} adresine baglaniliyor...`);
        
        const bot = mineflayer.createBot({
            host: cfg.ip,
            username: cfg.name || "MasterBot",
            version: cfg.version,
            auth: cfg.auth === 'online' ? 'microsoft' : 'offline'
        });

        bot.on('spawn', () => {
            socket.emit('log', `>> [✅] Basariyla giris yapildi! Surum: ${bot.version}`);
        });

        bot.on('chat', (username, msg) => {
            if(username !== bot.username) {
                socket.emit('log', `<${username}> ${msg}`);
                
                // Yapay Zeka Mantikli Soru Sorma Mekanizmasi
                if (msg.toLowerCase().includes("selam") || msg.toLowerCase().includes("sa")) {
                    setTimeout(() => {
                        const reply = "Selam patron, her sey yolunda mi? Maden mi kazayim yoksa pazar mi tarayayim?";
                        bot.chat(reply);
                        socket.emit('log', `AI (Bot): ${reply}`);
                    }, 2000);
                }
            }
        });

        bot.on('error', (err) => socket.emit('log', `!! [HATA]: ${err.message}`));
        bot.on('kicked', (reason) => socket.emit('log', `!! [KICK]: ${reason}`));
    });
});

server.listen(PORT, '0.0.0.0', () => console.log(`Master Core Aktif Port: ${PORT}`));
