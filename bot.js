const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

let bot = null;
let logs = [];

function addLog(msg, type) {
    const entry = { time: new Date().toLocaleTimeString(), msg, type: type || 'info' };
    logs.unshift(entry);
    if (logs.length > 100) logs.pop();
    io.emit('log', entry);
}

app.use(express.json());

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>AFK BOT</title>
    <style>
        body { background: #0a0a0f; color: white; font-family: monospace; padding: 20px; }
        input, button { background: #1a1a24; border: 1px solid #2a2a35; padding: 10px; color: white; margin: 5px; }
        .log { background: #1a1a24; height: 400px; overflow-y: auto; padding: 10px; margin-top: 20px; }
    </style>
</head>
<body>
    <h1>AFK BOT - AESIRMC</h1>
    <input type="text" id="username" placeholder="Bot Adi">
    <button onclick="start()">BOTU BASLAT</button>
    <button onclick="stop()">BOTU DURDUR</button>
    <hr>
    <input type="text" id="chatMsg" placeholder="Mesaj yaz...">
    <button onclick="sendMsg()">GONDER</button>
    <div class="log" id="logs"></div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        socket.on('log', (data) => {
            const div = document.getElementById('logs');
            const line = document.createElement('div');
            line.innerHTML = '[' + data.time + '] ' + data.msg;
            div.prepend(line);
        });
        function start() {
            const name = document.getElementById('username').value;
            fetch('/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name }) });
        }
        function stop() { fetch('/stop', { method: 'POST' }); }
        function sendMsg() {
            const msg = document.getElementById('chatMsg').value;
            fetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) });
            document.getElementById('chatMsg').value = '';
        }
    </script>
</body>
</html>
    `);
});

app.post('/start', (req, res) => {
    const username = req.body.username;
    if (!username) return res.json({ error: 'username gerekli' });
    
    if (bot) bot.end();
    
    bot = mineflayer.createBot({
        host: 'oyna.aesirmc.com',
        port: 25565,
        username: myshoue,
        auth: 'offline'
    });
    
    bot.once('spawn', () => {
        addLog(`Bot ${username} giris yapti`, 'success');
        setInterval(() => {
            if (bot && bot.entity) {
                const actions = ['forward', 'back', 'left', 'right'];
                const action = actions[Math.floor(Math.random() * actions.length)];
                bot.setControlState(action, true);
                setTimeout(() => bot.setControlState(action, false), 500);
            }
        }, 5000);
    });
    
    bot.on('end', () => addLog('Baglanti kesildi', 'error'));
    bot.on('error', (err) => addLog('Hata: ' + err.message, 'error'));
    bot.on('chat', (user, msg) => addLog(user + ': ' + msg, 'chat'));
    
    res.json({ success: true });
});

app.post('/stop', (req, res) => {
    if (bot) bot.end();
    bot = null;
    addLog('Bot durduruldu', 'info');
    res.json({ success: true });
});

app.post('/chat', (req, res) => {
    const msg = req.body.message;
    if (bot && bot.chat && msg) {
        bot.chat(msg);
        addLog('Bot: ' + msg, 'chat');
    }
    res.json({ success: true });
});

server.listen(PORT, () => console.log('Server on port', PORT));
