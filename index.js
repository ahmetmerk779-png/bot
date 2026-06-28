const express = require('express');
const http = require('http');
const mineflayer = require('mineflayer');
const { pathfinder, goals } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock');
const pvp = require('mineflayer-pvp').plugin;
const { OpenAI } = require('openai');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
app.use(express.urlencoded({ extended: true }));

const groq = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });

let bot;

// Dosya Yolu Sorununu Çözmek İçin Ana Dizin Yönlendirmesi
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/connect', (req, res) => {
    const { host, username, version } = req.body;
    if (bot) bot.quit();

    bot = mineflayer.createBot({ host, username, version });
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(collectBlock.plugin);
    bot.loadPlugin(pvp);

    // OTONOM ÖZELLİKLER
    bot.on('physicTick', () => {
        // Auto Eat
        if (bot.food < 15) {
            const food = bot.inventory.items().find(i => i.name.includes('cooked') || i.name === 'bread');
            if (food) bot.equip(food, 'hand').then(() => bot.consume());
        }

        // Auto Attack (Yakındaki canavara otomatik saldır)
        const entity = bot.nearestEntity(e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 5);
        if (entity) bot.pvp.attack(entity);
    });

    bot.on('chat', async (user, message) => {
        if (user === bot.username) return;

        if (message.startsWith('öğren:')) {
            const [_, k, v] = message.split(':');
            let m = fs.existsSync('memory.json') ? JSON.parse(fs.readFileSync('memory.json')) : {};
            m[k.trim()] = v.trim();
            fs.writeFileSync('memory.json', JSON.stringify(m));
            bot.chat("Bunu hafızama aldım.");
        } else {
            const response = await groq.chat.completions.create({
                messages: [{ role: "user", content: message }],
                model: "llama-3.3-70b-versatile",
            });
            bot.chat(response.choices[0].message.content);
        }
    });

    res.send("Bot bağlandı ve tüm otonom modlar aktif!");
});

server.listen(process.env.PORT || 3000);
