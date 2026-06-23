// gui-bridge.js
const express = require('express');
const app = express();

// GUI'den komut al ve bot'a ilet
app.post('/command', (req, res) => {
    const { action } = req.body; 
    if (action === 'FORCE_STOP') bot.quit();
    if (action === 'REJOIN') bot.connect();
    res.send({ status: 'Command Executed' });
});

app.listen(8080, () => console.log("[GUI]: Köprü 8080 portunda açık."));
