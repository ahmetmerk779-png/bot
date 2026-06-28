const express = require('express');
const { createBot } = require('./bot-logic');
const app = express();
app.use(express.urlencoded({ extended: true }));

// Burası senin "SİTEN"
app.get('/', (req, res) => {
    res.send(`
        <form action="/connect" method="POST">
            <input type="text" name="ip" placeholder="Sunucu IP" required><br>
            <input type="text" name="port" placeholder="Port (25565)" value="25565"><br>
            <input type="text" name="name" placeholder="Bot İsmi"><br>
            <button type="submit">BAĞLAN</button>
        </form>
    `);
});

app.post('/connect', (req, res) => {
    const { ip, port, name } = req.body;
    createBot(name, ip, port); // Botu tetikliyor
    res.send("Bot bağlanmaya çalışıyor! Loglara bak.");
});

app.listen(process.env.PORT || 3000);
