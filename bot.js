const mineflayer = require('mineflayer');
const mineflayerViewer = require('prismarine-viewer').mineflayer;
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const pvp = require('mineflayer-pvp').plugin;
const autoEat = require('mineflayer-auto-eat');
const tool = require('mineflayer-tool').plugin;

// KONFIGURASYON
const config = {
    host: 'aesirmc.asmp.fun',
    port: 25565,
    username: 'SENIN_HESAP_ADIN',
    auth: 'offline'
};

const bot = mineflayer.createBot(config);
bot.loadPlugin(pathfinder);
bot.loadPlugin(pvp);
bot.loadPlugin(autoEat);
bot.loadPlugin(tool);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

// AI AYARLARI (Dashboard'dan değişecek)
let aiConfig = {
    enabled: false,
    apiKey: '',
    model: 'gryphe/mythomax-l2-13b:free'
};

// MODÜL DURUMLARI
let modules = {
    farming: true,
    mining: true,
    combat: true,
    autoEat: true,
    afkMove: true,
    autoChat: true,
    autoReconnect: true,
    aiChat: false
};

// İSTATİSTİKLER
let stats = {
    cropsPlanted: 0,
    cropsHarvested: 0,
    blocksMined: 0,
    diamondsFound: 0,
    ironFound: 0,
    goldFound: 0,
    emeraldFound: 0,
    coalFound: 0,
    enemiesKilled: 0,
    deaths: 0,
    chatMessages: 0,
    startTime: Date.now()
};

// CANLI LOG
let logs = [];

function addLog(msg, type = 'info') {
    const logEntry = { time: new Date().toLocaleTimeString(), msg, type };
    logs.unshift(logEntry);
    if (logs.length > 100) logs.pop();
    io.emit('log', logEntry);
    console.log(`[${logEntry.time}] ${msg}`);
}

// AI SOHBET FONKSİYONU
async function aiChat(message, sender) {
    if (!aiConfig.enabled || !aiConfig.apiKey) return null;
    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: aiConfig.model,
            messages: [
                { role: 'system', content: 'You are a helpful Minecraft bot assistant. Reply shortly and naturally in Turkish or English.' },
                { role: 'user', content: `${sender} said: ${message}. Reply as a Minecraft bot.` }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${aiConfig.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content;
    } catch (err) {
        addLog(`AI Error: ${err.message}`, 'error');
        return null;
    }
}

// SOHBET DİNLEME
bot.on('chat', async (username, message) => {
    if (username === bot.username) return;
    stats.chatMessages++;
    addLog(`${username}: ${message}`, 'chat');
    
    if (message.startsWith('!')) {
        const cmd = message.slice(1).split(' ')[0];
        switch(cmd) {
            case 'help':
                bot.chat('Commands: !stats, !modules, !pos, !follow, !stop, !come');
                break;
            case 'stats':
                bot.chat(`Mined: ${stats.blocksMined} | Diamonds: ${stats.diamondsFound} | Kills: ${stats.enemiesKilled}`);
                break;
            case 'modules':
                const active = Object.entries(modules).filter(([k,v]) => v === true).map(([k]) => k).join(', ');
                bot.chat(`Active: ${active}`);
                break;
            case 'pos':
                const pos = bot.entity.position;
                bot.chat(`X:${Math.floor(pos.x)} Y:${Math.floor(pos.y)} Z:${Math.floor(pos.z)}`);
                break;
            case 'follow':
                modules.followTarget = username;
                bot.chat(`Following ${username}`);
                break;
            case 'stop':
                modules.followTarget = null;
                bot.chat('Stopped');
                break;
            case 'come':
                modules.followTarget = username;
                break;
            default:
                if (modules.aiChat && aiConfig.enabled) {
                    const reply = await aiChat(message, username);
                    if (reply) bot.chat(reply);
                }
        }
    }
});

// TAKİP ETME
setInterval(() => {
    if (modules.followTarget) {
        const player = bot.players[modules.followTarget];
        if (player && player.entity) {
            const goal = new goals.GoalFollow(player.entity, 3);
            bot.pathfinder.setGoal(goal, true);
        }
    }
}, 1000);

// FARMING
let farmingInterval = null;
function startFarming() {
    if (farmingInterval) clearInterval(farmingInterval);
    farmingInterval = setInterval(() => {
        if (!modules.farming) return;
        const wheat = bot.findBlock({ matching: (block) => block.name === 'wheat', maxDistance: 32 });
        if (wheat) {
            bot.tool.equipForBlock(wheat, () => {
                bot.dig(wheat, (err) => {
                    if (!err) {
                        stats.cropsHarvested++;
                        addLog('Farming: Wheat harvested');
                        setTimeout(() => {
                            const below = bot.blockAt(wheat.position.offset(0, -1, 0));
                            if (below && below.name.includes('farmland')) {
                                const seeds = bot.inventory.items.find(i => i.name === 'wheat_seeds');
                                if (seeds) {
                                    bot.equip(seeds, 'hand');
                                    bot.placeBlock(below, new Vec3(0, 1, 0), () => {
                                        stats.cropsPlanted++;
                                        addLog('Farming: Wheat planted');
                                    });
                                }
                            }
                        }, 500);
                    }
                });
            });
        }
    }, 15000);
}

// MINING
let miningInterval = null;
function startMining() {
    if (miningInterval) clearInterval(miningInterval);
    miningInterval = setInterval(() => {
        if (!modules.mining) return;
        const ores = ['diamond_ore', 'iron_ore', 'gold_ore', 'emerald_ore', 'coal_ore'];
        let target = null;
        for (const ore of ores) {
            target = bot.findBlock({ matching: (block) => block.name === ore, maxDistance: 32 });
            if (target) break;
        }
        if (target) {
            bot.tool.equipForBlock(target, () => {
                bot.dig(target, (err) => {
                    if (!err) {
                        stats.blocksMined++;
                        if (target.name === 'diamond_ore') stats.diamondsFound++;
                        if (target.name === 'iron_ore') stats.ironFound++;
                        if (target.name === 'gold_ore') stats.goldFound++;
                        addLog(`Mining: ${target.name} mined`);
                    }
                });
            });
        } else {
            const below = bot.blockAt(bot.entity.position.offset(0, -1, 0));
            if (below && below.name !== 'bedrock') {
                bot.tool.equipForBlock(below, () => {
                    bot.dig(below, () => {
                        stats.blocksMined++;
                        addLog('Mining: Digging down');
                    });
                });
            }
        }
    }, 8000);
}

// COMBAT
function startCombat() {
    bot.on('entityHurt', (entity) => {
        if (!modules.combat) return;
        if (entity === bot.entity) {
            const attacker = bot.nearestEntity((e) => e.position.distanceTo(bot.entity.position) < 5 && e.type === 'mob');
            if (attacker) {
                bot.pvp.attack(attacker);
                addLog(`Combat: Attacking ${attacker.name}`);
            }
        }
    });
    setInterval(() => {
        if (!modules.combat) return;
        const hostile = bot.nearestEntity((e) => {
            return e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 16 &&
                   (e.name === 'zombie' || e.name === 'skeleton' || e.name === 'spider' || e.name === 'creeper');
        });
        if (hostile) {
            bot.pvp.attack(hostile);
            addLog(`Combat: Engaging ${hostile.name}`);
        }
    }, 3000);
}

bot.on('entityGone', (entity) => {
    if (entity === bot.pvp.target) {
        stats.enemiesKilled++;
        addLog('Combat: Enemy defeated');
    }
});

// AUTO EAT
bot.on('health', () => {
    if (modules.autoEat && bot.food < 14) {
        bot.autoEat.eat();
        addLog('AutoEat: Eating');
    }
});

// AFK HAREKET
setInterval(() => {
    if (!modules.afkMove) return;
    const actions = ['forward', 'back', 'left', 'right'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    bot.setControlState(action, true);
    setTimeout(() => bot.setControlState(action, false), 600);
    if (Math.random() > 0.8) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 200);
    }
}, 6000);

// OTOMATİK YENİDEN BAĞLANMA
bot.on('end', () => {
    addLog('Disconnected, reconnecting in 10s', 'error');
    setTimeout(() => bot.connect(), 10000);
});

// 3D VIEWER
bot.once('spawn', () => {
    addLog('Bot spawned successfully');
    addLog(`Position: ${Math.floor(bot.entity.position.x)} ${Math.floor(bot.entity.position.y)} ${Math.floor(bot.entity.position.z)}`);
    mineflayerViewer(bot, { port: 3001, firstPerson: true, viewDistance: 6 });
    addLog('3D Viewer started on port 3001');
    startFarming();
    startMining();
    startCombat();
});

// WEB DASHBOARD
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AFK BOT | AESIRMC</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0a0a0f; font-family: monospace; height: 100vh; overflow: hidden; }
        .top-bar { background: #0f0f14; padding: 12px 24px; border-bottom: 1px solid #2a2a35; display: flex; justify-content: space-between; font-size: 13px; color: #a1a1aa; }
        .main { display: flex; height: calc(100vh - 45px); }
        .viewer { flex: 3; background: #000; }
        .viewer iframe { width: 100%; height: 100%; border: none; }
        .panel { flex: 1; background: #0f0f14; border-left: 1px solid #2a2a35; display: flex; flex-direction: column; overflow-y: auto; }
        .module { background: #1a1a24; margin: 12px; padding: 16px; border-radius: 8px; border: 1px solid #2a2a35; cursor: pointer; transition: 0.2s; }
        .module:hover { background: #22222e; }
        .module h3 { color: #8b5cf6; font-size: 14px; margin-bottom: 8px; }
        .module p { font-size: 12px; color: #22c55e; }
        .stat { font-size: 11px; color: #a1a1aa; margin-top: 6px; }
        .log-area { background: #0a0a0f; margin: 12px; padding: 12px; border-radius: 8px; border: 1px solid #2a2a35; max-height: 300px; overflow-y: auto; }
        .log-line { font-size: 10px; font-family: monospace; padding: 4px 0; color: #a1a1aa; border-bottom: 1px solid #1a1a24; }
        .green { color: #22c55e; }
        .red { color: #ef4444; }
        .blue { color: #3b82f6; }
        input, select { background: #1a1a24; border: 1px solid #2a2a35; padding: 8px; border-radius: 6px; color: white; margin: 4px; width: calc(100% - 8px); }
        button { background: #2a2a35; border: none; padding: 8px 16px; margin: 4px; border-radius: 6px; color: white; cursor: pointer; }
        button:hover { background: #3a3a45; }
        .settings { background: #1a1a24; margin: 12px; padding: 16px; border-radius: 8px; border: 1px solid #2a2a35; }
        @media (max-width: 768px) { .main { flex-direction: column; } .panel { max-height: 40%; border-left: none; border-top: 1px solid #2a2a35; } }
    </style>
</head>
<body>
    <div class="top-bar">
        <span>STATUS: <span id="statusText">ONLINE</span></span>
        <span>BOT: ${config.username}</span>
        <span>POS: <span id="botPos">-</span></span>
    </div>
    <div class="main">
        <div class="viewer">
            <iframe src="/viewer"></iframe>
        </div>
        <div class="panel">
            <div class="module" onclick="toggleModule('farming')">
                <h3>FARMING</h3>
                <p id="farmingStatus">ACTIVE</p>
                <div class="stat">PLANTED: <span id="cropsPlanted">0</span> | HARVESTED: <span id="cropsHarvested">0</span></div>
            </div>
            <div class="module" onclick="toggleModule('mining')">
                <h3>MINING</h3>
                <p id="miningStatus">ACTIVE</p>
                <div class="stat">MINED: <span id="blocksMined">0</span> | DIAMONDS: <span id="diamondsFound">0</span></div>
            </div>
            <div class="module" onclick="toggleModule('combat')">
                <h3>COMBAT</h3>
                <p id="combatStatus">ACTIVE</p>
                <div class="stat">KILLS: <span id="enemiesKilled">0</span></div>
            </div>
            <div class="settings">
                <h3 style="color:#8b5cf6; margin-bottom:8px;">AI SETTINGS</h3>
                <input type="text" id="apiKey" placeholder="OpenRouter API Key" value="${aiConfig.apiKey}">
                <select id="model">
                    <option value="gryphe/mythomax-l2-13b:free">MythoMax (Free)</option>
                    <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="google/gemini-pro">Gemini Pro</option>
                </select>
                <button onclick="saveAiSettings()">SAVE AI</button>
                <button onclick="toggleAi()" id="aiToggleBtn">AI: OFF</button>
            </div>
            <div class="log-area" id="logArea">
                <div class="log-line">system ready</div>
            </div>
        </div>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        socket.on('log', (data) => {
            const logDiv = document.createElement('div');
            logDiv.className = 'log-line';
            logDiv.innerHTML = '<span class="blue">[' + data.time + ']</span> ' + data.msg;
            document.getElementById('logArea').prepend(logDiv);
            if(document.getElementById('logArea').children.length > 50) {
                document.getElementById('logArea').removeChild(document.getElementById('logArea').lastChild);
            }
        });
        socket.on('stats', (data) => {
            document.getElementById('cropsPlanted').innerText = data.cropsPlanted;
            document.getElementById('cropsHarvested').innerText = data.cropsHarvested;
            document.getElementById('blocksMined').innerText = data.blocksMined;
            document.getElementById('diamondsFound').innerText = data.diamondsFound;
            document.getElementById('enemiesKilled').innerText = data.enemiesKilled;
            document.getElementById('botPos').innerText = data.pos;
        });
        socket.on('modules', (data) => {
            document.getElementById('farmingStatus').innerText = data.farming ? 'ACTIVE' : 'OFF';
            document.getElementById('miningStatus').innerText = data.mining ? 'ACTIVE' : 'OFF';
            document.getElementById('combatStatus').innerText = data.combat ? 'ACTIVE' : 'OFF';
            document.getElementById('aiToggleBtn').innerText = data.aiChat ? 'AI: ON' : 'AI: OFF';
        });
        function toggleModule(module) {
            fetch('/toggle/' + module);
        }
        function saveAiSettings() {
            const apiKey = document.getElementById('apiKey').value;
            const model = document.getElementById('model').value;
            fetch('/save-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey, model })
            }).then(() => alert('AI settings saved'));
        }
        function toggleAi() {
            fetch('/toggle-ai');
        }
        setInterval(() => {
            fetch('/stats');
        }, 2000);
    </script>
</body>
</html>
    `);
});

app.get('/viewer', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>3D Viewer</title><style>body{margin:0;overflow:hidden;background:#000;}</style></head>
<body><canvas id="canvas"></canvas>
<script>
    const ws = new WebSocket('ws://' + location.hostname + ':3001');
    ws.binaryType = 'arraybuffer';
    ws.onmessage = (e) => { const data = new Uint8Array(e.data); };
</script>
</body>
</html>
    `);
});

// API ENDPOINTLER
app.get('/toggle/:module', (req, res) => {
    const module = req.params.module;
    if (modules[module] !== undefined) {
        modules[module] = !modules[module];
        addLog(`${module} toggled: ${modules[module] ? 'ON' : 'OFF'}`);
        io.emit('modules', modules);
    }
    res.json({ [module]: modules[module] });
});

app.get('/toggle-ai', (req, res) => {
    modules.aiChat = !modules.aiChat;
    aiConfig.enabled = modules.aiChat;
    addLog(`AI Chat toggled: ${modules.aiChat ? 'ON' : 'OFF'}`);
    io.emit('modules', modules);
    res.json({ aiChat: modules.aiChat });
});

app.post('/save-ai', (req, res) => {
    aiConfig.apiKey = req.body.apiKey;
    aiConfig.model = req.body.model;
    aiConfig.enabled = modules.aiChat;
    addLog('AI settings saved');
    res.json({ success: true });
});

app.get('/stats', (req, res) => {
    res.json({
        cropsPlanted: stats.cropsPlanted,
        cropsHarvested: stats.cropsHarvested,
        blocksMined: stats.blocksMined,
        diamondsFound: stats.diamondsFound,
        enemiesKilled: stats.enemiesKilled,
        pos: `${Math.floor(bot.entity.position.x)} ${Math.floor(bot.entity.position.y)} ${Math.floor(bot.entity.position.z)}`
    });
});

// SOCKET İSTATİSTİK GÖNDERİMİ
setInterval(() => {
    io.emit('stats', {
        cropsPlanted: stats.cropsPlanted,
        cropsHarvested: stats.cropsHarvested,
        blocksMined: stats.blocksMined,
        diamondsFound: stats.diamondsFound,
        enemiesKilled: stats.enemiesKilled,
        pos: bot.entity ? `${Math.floor(bot.entity.position.x)} ${Math.floor(bot.entity.position.y)} ${Math.floor(bot.entity.position.z)}` : '0 0 0'
    });
    io.emit('modules', modules);
}, 2000);

server.listen(PORT, () => {
    console.log(`Dashboard: http://localhost:${PORT}`);
    addLog(`Server started on port ${PORT}`);
});
