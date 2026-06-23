const express = require('express');
const app = express();
const path = require('path');

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manuel olarak portu al
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`God Mode Fabrika ${PORT} portunda çalışıyor.`);
});
