const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

let bot = null;
let logs = [];
let botStatus = 'offline';
let botUsername = 'BotHesap';

function addLog(msg, type = 'info') {
    const entry = { time: new Date().toLocaleTimeString(), msg, type };
    logs.unshift(entry);
    if (logs.length > 100) logs.pop();
    io.emit('log', entry);
}

function startBot() {
    if (bot) bot.end();
    
    bot = mineflayer.createBot({
        host: 'play.aesirmc.com',
        port: 25565,
        username: myshoue,
        auth: 'offline'
    });

    bot.once('spawn', () => {
        botStatus = 'online';
        addLog(`Bot ${botUsername} giris yapti`, 'success');
        io.emit('status', { status: 'online', username: botUsername });
        
        setInterval(() => {
            if (bot && bot.entity) {
                const actions = ['forward', 'back', 'left', 'right'];
                const action = actions[Math.floor(Math.random() * actions.length)];
                bot.setControlState(action, true);
                setTimeout(() => bot.setControlState(action, false), 500);
            }
        }, 5000);
    });

    bot.on('end', () => {
        botStatus = 'offline';
        addLog('Baglanti kesildi', 'error');
        io.emit('status', { status: 'offline', username: null });
        setTimeout(() => startBot(), 10000);
    });

    bot.on('error', (err) => addLog(`Hata: ${err.message}`, 'error'));
    
    bot.on('chat', (username, message) => {
        addLog(`${username}: ${message}`, 'chat');
    });
}

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    const currentTime = new Date().toLocaleTimeString();
    res.send(`
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>AFK Bot | Aesirmc ASMP</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            background: #0a0a0f;
            color: #e1e1e6;
            height: 100vh;
            overflow: hidden;
        }
        
        .app {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        
        .header {
            background: rgba(18, 18, 24, 0.95);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid #2a2a35;
            padding: 16px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
        }
        
        .logo {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .logo-icon {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: bold;
        }
        
        .logo h1 {
            font-size: 20px;
            font-weight: 600;
            background: linear-gradient(135deg, #e1e1e6, #a1a1aa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .badge {
            background: #1a1a24;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            color: #8b5cf6;
            font-weight: 500;
        }
        
        .main {
            flex: 1;
            display: flex;
            overflow: hidden;
        }
        
        .sidebar {
            width: 280px;
            background: #0f0f14;
            border-right: 1px solid #2a2a35;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
        }
        
        @media (max-width: 768px) {
            .sidebar {
                display: none;
            }
        }
        
        .sidebar-header {
            padding: 20px;
            border-bottom: 1px solid #2a2a35;
        }
        
        .new-chat-btn {
            width: 100%;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border: none;
            padding: 12px;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .new-chat-btn:hover {
            transform: translateY(-1px);
            opacity: 0.9;
        }
        
        .chat-list {
            flex: 1;
            padding: 12px;
        }
        
        .chat-item {
            padding: 12px;
            border-radius: 10px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 14px;
        }
        
        .chat-item:hover {
            background: #1a1a24;
        }
        
        .chat-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #0a0a0f;
        }
        
        .status-bar {
            background: #0f0f14;
            padding: 12px 24px;
            border-bottom: 1px solid #2a2a35;
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #22c55e;
            animation: pulse 2s infinite;
        }
        
        .status-dot.offline {
            background: #a1a1aa;
            animation: none;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .status-text {
            color: #a1a1aa;
        }
        
        .logs-container {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .log-message {
            padding: 12px 16px;
            border-radius: 12px;
            max-width: 85%;
            animation: fadeIn 0.3s ease;
            font-size: 14px;
            line-height: 1.5;
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .log-success {
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.2);
            align-self: flex-start;
            color: #22c55e;
        }
        
        .log-error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
            align-self: flex-start;
            color: #ef4444;
        }
        
        .log-info {
            background: rgba(139, 92, 246, 0.1);
            border: 1px solid rgba(139, 92, 246, 0.2);
            align-self: flex-start;
            color: #a78bfa;
        }
        
        .log-chat {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.2);
            align-self: flex-start;
            color: #60a5fa;
        }
        
        .log-time {
            font-size: 10px;
            color: #52525b;
            margin-top: 4px;
        }
        
        .input-area {
            padding: 20px 24px;
            background: #0f0f14;
            border-top: 1px solid #2a2a35;
        }
        
        .input-wrapper {
            display: flex;
            gap: 12px;
            align-items: center;
            background: #1a1a24;
            border-radius: 16px;
            padding: 8px 16px;
            border: 1px solid #2a2a35;
            transition: all 0.2s;
        }
        
        .input-wrapper:focus-within {
            border-color: #6366f1;
        }
        
        .username-input {
            flex: 1;
            background: transparent;
            border: none;
            color: #e1e1e6;
            font-size: 14px;
            padding: 12px 0;
            outline: none;
        }
        
        .username-input::placeholder {
            color: #52525b;
        }
        
        .action-buttons {
            display: flex;
            gap: 8px;
        }
        
        .action-btn {
            background: transparent;
            border: none;
            padding: 8px 16px;
            border-radius: 10px;
            color: white;
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .start-btn {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
        }
        
        .stop-btn {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        .send-btn {
            background: linear-gradient(135deg, #22c55e, #16a34a);
        }
        
        .action-btn:hover {
            transform: scale(0.98);
        }
        
        ::-webkit-scrollbar {
            width: 6px;
        }
        
        ::-webkit-scrollbar-track {
            background: #1a1a24;
        }
        
        ::-webkit-scrollbar-thumb {
            background: #3a3a45;
            border-radius: 3px;
        }
    </style>
    <script src="/socket.io/socket.io.js"></script>
</head>
<body>
    <div class="app">
        <div class="header">
            <div class="logo">
                <div class="logo-icon">AFK</div>
                <h1>AFK Bot Studio</h1>
            </div>
            <div class="badge">Aesirmc • ASMP</div>
        </div>
        
        <div class="main">
            <div class="sidebar">
                <div class="sidebar-header">
                    <button class="new-chat-btn" onclick="clearLogs()">Yeni Oturum</button>
                </div>
                <div class="chat-list">
                    <div class="chat-item">AFK Bot • Aktif</div>
                </div>
            </div>
            
            <div class="chat-area">
                <div class="status-bar">
                    <div class="status-dot" id="statusDot"></div>
                    <div class="status-text" id="statusText">Bot durduruldu</div>
                </div>
                
                <div class="logs-container" id="logsContainer">
                    <div class="log-message log-info">
                        Bot hazir. Baslatmak icin kullanici adini gir ve "Baslat" butonuna tikla.
                        <div class="log-time">` + currentTime + `</div>
                    </div>
                </div>
                
                <div class="input-area">
                    <div class="input-wrapper">
                        <input type="text" class="username-input" id="username" placeholder="Minecraft kullanici adin">
                        <div class="action-buttons">
                            <button class="action-btn start-btn" onclick="startBot()">Baslat</button>
                            <button class="action-btn stop-btn" onclick="stopBot()">Durdur</button>
                        </div>
                    </div>
                    <div style="margin-top: 12px;">
                        <div class="input-wrapper">
                            <input type="text" class="username-input" id="chatInput" placeholder="Bot'a mesaj gonder...">
                            <button class="action-btn send-btn" onclick="sendChat()">Gonder</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        const socket = io();
        
        socket.on('log', (log) => {
            addLogToUI(log);
        });
        
        socket.on('status', (status) => {
            document.getElementById('statusText').innerText = status.status === 'online' ? 'Bot aktif' : 'Bot durduruldu';
            const dot = document.getElementById('statusDot');
            if (status.status === 'online') {
                dot.style.background = '#22c55e';
                dot.classList.remove('offline');
            } else {
                dot.style.background = '#a1a1aa';
                dot.classList.add('offline');
            }
        });
        
        function addLogToUI(log) {
            const container = document.getElementById('logsContainer');
            const logDiv = document.createElement('div');
            let typeClass = 'log-info';
            if (log.type === 'success') typeClass = 'log-success';
            else if (log.type === 'error') typeClass = 'log-error';
            else if (log.type === 'chat') typeClass = 'log-chat';
            else typeClass = 'log-info';
            
            logDiv.className = 'log-message ' + typeClass;
            logDiv.innerHTML = log.msg + '<div class="log-time">' + log.time + '</div>';
            container.appendChild(logDiv);
            container.scrollTop = container.scrollHeight;
        }
        
        function startBot() {
            const username = document.getElementById('username').value;
            if (!username) {
                addLogToUI({type: 'error', msg: 'Lutfen kullanici adini gir', time: new Date().toLocaleTimeString()});
                return;
            }
            fetch('/start', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: username})
            });
        }
        
        function stopBot() {
            fetch('/stop', {method: 'POST'});
        }
        
        function sendChat() {
            const message = document.getElementById('chatInput').value;
            if (!message) return;
            fetch('/chat', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({message: message})
            });
            document.getElementById('chatInput').value = '';
        }
        
        function clearLogs() {
            document.getElementById('logsContainer').innerHTML = '';
            addLogToUI({type: 'info', msg: 'Yeni oturum baslatildi', time: new Date().toLocaleTimeString()});
        }
    </script>
</body>
</html>
    `);
});

app.post('/start', express.json(), (req, res) => {
    const username = req.body.username;
    if (bot) bot.end();
    
    botUsername = username;
    startBot();
    res.json({ success: true });
});

app.post('/stop', (req, res) => {
    if (bot) {
        bot.end();
        bot = null;
    }
    botStatus = 'offline';
    addLog('Bot durduruldu', 'info');
    io.emit('status', { status: 'offline', username: null });
    res.json({ success: true });
});

app.post('/chat', express.json(), (req, res) => {
    const message = req.body.message;
    if (bot && bot.chat && message) {
        bot.chat(message);
        addLog(`Bot: ${message}`, 'chat');
    }
    res.json({ success: true });
});

server.listen(PORT, () => {
    console.log(`ChatCraft Clone: http://localhost:${PORT}`);
    addLog('Sunucu baslatildi', 'info');
});

startBot();
