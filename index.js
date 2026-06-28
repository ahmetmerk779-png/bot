const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mineflayer = require('mineflayer');
const { OpenAI } = require('openai'); // Groq için

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

let bot;
const groq = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });

app.post('/connect', (req, res) => {
    const { host, username, version } = req.body;
    if (bot) bot.quit();

    bot = mineflayer.createBot({ host, username, version });

    bot.on('spawn', () => io.emit('log', 'SİSTEM: Bot giriş yaptı!'));
    
    bot.on('chat', async (user, message) => {
        io.emit('log', `${user}: ${message}`);
        if (user === bot.username) return;

        // AI ile Konuşma Kısmı
        const response = await groq.chat.completions.create({
            messages: [{ role: "user", content: message }],
            model: "llama-3.3-70b-versatile",
        });
        bot.chat(response.choices[0].message.content);
    });

    res.send("Bot Aktif! Oyuna dön ve konuş.");
});

http.listen(process.env.PORT || 3000);
