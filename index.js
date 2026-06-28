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
const io = require('socket.io')(server);

app.use(express.urlencoded({ extended: true }));
const groq = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });

let bot;

// Hafıza Yönetimi
function saveToMemory(key, value) {
    let memory = fs.existsSync('memory.json') ? JSON.parse(fs.readFileSync('memory.json')) : {};
    memory[key] = value;
    fs.writeFileSync('memory.json', JSON.stringify(memory));
}

app.post('/connect', (req, res) => {
    const { host, username, version } = req.body;
    if (bot) bot.quit();

    bot = mineflayer.createBot({ host, username, version });
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(collectBlock.plugin);
    bot.loadPlugin(pvp);

    bot.on('spawn', () => console.log('Bot dünyada!'));

    bot.on('chat', async (user, message) => {
        if (user === bot.username) return;

        // Öğrenme Komutu
        if (message.startsWith('öğren:')) {
            const [_, key, val] = message.split(':');
            saveToMemory(key.trim(), val.trim());
            bot.chat(`Artık ${key} hakkında şunu biliyorum: ${val}`);
            return;
        }

        // Aksiyon Komutları
        if (message.includes('odun kır')) {
            const block = bot.findBlock({ matching: (b) => b.name.includes('log') });
            if (block) bot.collectBlock.collect(block);
        } else {
            // AI Yanıtı
            const response = await groq.chat.completions.create({
                messages: [{ role: "user", content: message }],
                model: "llama-3.3-70b-versatile",
            });
            bot.chat(response.choices[0].message.content);
        }
    });

    // Otonom Gezinme
    setInterval(() => {
        if (!bot.pathfinder.isMoving()) {
            const randomX = Math.floor(bot.entity.position.x + (Math.random() * 10 - 5));
            const randomZ = Math.floor(bot.entity.position.z + (Math.random() * 10 - 5));
            bot.pathfinder.setGoal(new goals.GoalBlock(randomX, bot.entity.position.y, randomZ));
        }
    }, 60000);

    res.send("Bot bağlandı ve otonom moda geçti.");
});

server.listen(process.env.PORT || 3000);
