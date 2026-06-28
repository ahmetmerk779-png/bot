const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mineflayer = require('mineflayer');
require('dotenv').config();

// Web Arayüzü (Canlı Konsol)
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

const bot = mineflayer.createBot({
    host: process.env.HOST,
    username: 'AI_Yonetici',
    version: '1.21.8'
});

// Canlı Logları Socket ile tarayıcıya gönder
const sendLog = (msg) => io.emit('log', msg);

bot.on('spawn', () => sendLog('Bot dünyada!'));
bot.on('chat', (username, message) => {
    sendLog(`${username}: ${message}`);
    // AI Yönetim mantığı buraya gelecek
});

io.on('connection', (socket) => sendLog('Web arayüzü bağlandı.'));
http.listen(process.env.PORT || 3000);
