const express = require('express');
const { createBot } = require('./bot-logic');
const app = express();
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send(`
        <form action="/connect" method="POST">
            <input type="text" name="ip" placeholder="Server IP" required>
            <input type="text" name="port" placeholder="Port" value="25565">
            <input type="text" name="name" placeholder="Bot İsmi" required>
            <button type="submit">Botu Başlat</button>
        </form>
    `);
});

app.post('/connect', (req, res) => {
    const { ip, port, name } = req.body;
    createBot(name, ip, port);
    res.send("Bot sunucuya gönderildi! Logları terminalden takip et.");
});

app.listen(process.env.PORT || 3000, () => console.log("Panel 3000 portunda açık."));
