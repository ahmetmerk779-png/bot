const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock').plugin;
const pvp = require('mineflayer-pvp').plugin;
const collectItems = require('mineflayer-collectitems').plugin;
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
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(collectBlock);
    bot.loadPlugin(pvp);
    bot.loadPlugin(collectItems);

    bot.on('spawn', () => io.emit('log', 'Bot dünyaya giriş yaptı!'));

    // Takılma Kurtarma
    bot.pathfinder.on('stuck', () => {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
        bot.look(bot.entity.yaw + Math.PI, 0);
    });

    // Chat ve AI Entegrasyonu
    bot.on('chat', async (user, message) => {
        if (user === bot.username) return;
        io.emit('log', `${user}: ${message}`);

        if (message.startsWith('git ')) {
            const args = message.split(' ');
            bot.pathfinder.setGoal(new goals.GoalBlock(parseInt(args[1]), parseInt(args[2]), parseInt(args[3])));
        }

        const response = await groq.chat.completions.create({
            messages: [{ role: "system", content: "Sen otonom bir Minecraft botusun. 'odun kır', 'maden kaz', 'ev yap', 'yemek ye' komutlarını anla." },
                       { role: "user", content: message }],
            model: "llama-3.3-70b-versatile",
        });

        const reply = response.choices[0].message.content;
        bot.chat(reply);
        
        if (reply.includes('odun kır')) {
            const block = bot.findBlock({ matching: (b) => b.name.includes('log') });
            if (block) bot.collectBlock.collect(block);
        }
    });

    // Otonom Kararlar (10 sn'de bir)
    setInterval(async () => {
        if (bot.health < 10) bot.chat("Canım az, kaçıyorum!");
        if (bot.food < 12) {
            const food = bot.inventory.items().find(i => i.name.includes('cooked') || i.name === 'bread');
            if (food) { await bot.equip(food, 'hand'); bot.consume(); }
        }
    }, 10000);

    res.send("Bot bağlandı. Konsolu kontrol et.");
});

http.listen(process.env.PORT || 3000);
