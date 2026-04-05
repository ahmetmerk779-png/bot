const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const config = {
    host: 'oyna.aesirmc.com',
    port: 25565,
    username: 'myshoue',
    auth: 'offline'
};

const bot = mineflayer.createBot(config);
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

let logs = [];

function addLog(msg) {
    const entry = { time: new Date().toLocaleTimeString(), msg };
    logs.unshift(entry);
    if (logs.length > 50) logs.pop();
    io.emit('log', entry);
    console.log(msg);
}

bot.once('spawn', () => {
    addLog('Bot spawned');
    setInterval(() => {
        const actions = ['forward', 'back', 'left', 'right'];
        const action = actions[Math.floor(Math.random() * actions.length)];
        bot.setControlState(action, true);
        setTimeout(() => bot.setControlState(action, false), 600);
    }, 5000);
});

bot.on('end', () => {
    addLog('Disconnected, reconnecting...');
    setTimeout(() => bot.connect(), 10000);
});

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>AFK BOT</title>
    <style>
        body { background: #0a0a0f; color: white; font-family: monospace; padding: 20px; }
        .log { background: #1a1a24; padding: 10px; border-radius: 8px; margin-top: 20px; }
        .log div { font-size: 12px; padding: 4px 0; border-bottom: 1px solid #2a2a35; }
    </style>
</head>
<body>
    <h1>AFK BOT - AESIRMC</h1>
    <p>Status: ONLINE</p>
    <p>Bot: ${config.username}</p>
    <div class="log" id="logs"></div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        socket.on('log', (data) => {
            const div = document.getElementById('logs');
            const entry = document.createElement('div');
            entry.innerHTML = '[' + data.time + '] ' + data.msg;
            div.prepend(entry);
        });
    </script>
</body>
</html>
    `);
});

io.on('connection', (socket) => {
    logs.forEach(log => socket.emit('log', log));
});

server.listen(PORT, () => {
    console.log(`Server on port ${PORT}`);
});
