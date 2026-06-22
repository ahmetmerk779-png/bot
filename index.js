const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <style>
                body { 
                    background-color: #121212; 
                    color: white; 
                    font-family: sans-serif; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    height: 100vh; 
                    margin: 0; 
                }
                .card { 
                    background: rgba(30, 30, 30, 0.6); 
                    backdrop-filter: blur(20px); 
                    padding: 40px; 
                    border-radius: 20px; 
                    text-align: center; 
                    border: 1px solid rgba(255,255,255,0.1);
                    width: 300px;
                }
                .status { color: #1DB954; font-weight: bold; margin-top: 10px; }
                button { 
                    margin-top: 20px; 
                    background: #1DB954; 
                    border: none; 
                    padding: 12px 25px; 
                    border-radius: 25px; 
                    color: white; 
                    font-weight: bold; 
                    cursor: pointer;
                }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>asmp</h1>
                <p>Kontrol Paneli</p>
                <div class="status">● SİSTEM AKTİF</div>
                <button onclick="alert('Bot kontrol ediliyor...')">Yenile</button>
            </div>
        </body>
        </html>
    `);
});

app.listen(process.env.PORT || 3000);
