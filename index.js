const express = require('express');
const app = express();
const path = require('path');
const agent = require('./lib/agent'); // Artık hata vermeyecek

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(process.env.PORT || 3000, () => {
    console.log('God Mode Fabrika Aktif.');
    agent.monitorSystem();
});
