const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock');
const pvp = require('mineflayer-pvp').plugin;
const collectItems = require('mineflayer-collectitems');
const { OpenAI } = require('openai');
require('dotenv').config();

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const groq = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });

let bot;

app.post('/connect', (req, res) => {
    const { host, username, version } = req.body;
    if (bot) bot.quit();

    bot = mineflayer.createBot({ host, username, version });
    
    // Eklentileri yükle
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(collectBlock.plugin);
    bot.loadPlugin(pvp);
    bot.loadPlugin(collectItems.plugin);

    bot.on('spawn', () => io.emit('log', 'Bot dünyada!'));
    
    bot.on('chat', async (user, message) => {
        if (user === bot.username) return;
        io.emit('log', `${user}: ${message}`);
        
        const response = await groq.chat.completions.create({
            messages: [{ role: "user", content: message }],
            model: "llama-3.3-70b-versatile",
        });
        bot.chat(response.choices[0].message.content);
    });

    res.send("Bot Başlatıldı!");
});

http.listen(process.env.PORT || 3000);
