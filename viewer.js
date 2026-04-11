const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { Viewer } = require('prismarine-viewer');

let bot = null;
let viewer = null;
let statusInterval = null;

// DOM Elemanları
const connectButton = document.getElementById('connect-button');
const connectionStatus = document.getElementById('connection-status');
const serverIpInput = document.getElementById('server-ip');
const botUsernameInput = document.getElementById('bot-username');

const botHealth = document.getElementById('bot-health');
const botFood = document.getElementById('bot-food');
const botPosition = document.getElementById('bot-position');

// Hareket butonları
const moveForward = document.getElementById('move-forward');
const moveBack = document.getElementById('move-back');
const moveLeft = document.getElementById('move-left');
const moveRight = document.getElementById('move-right');
const actionJump = document.getElementById('action-jump');
const actionSneak = document.getElementById('action-sneak');
const actionAttack = document.getElementById('action-attack');
const actionUse = document.getElementById('action-use');

// Yardımcı fonksiyon: Kontrol durumunu ayarla
function setControlState(control, state) {
  if (!bot) return;
  bot.setControlState(control, state);
}

// Bağlanma butonu
connectButton.addEventListener('click', () => {
  if (bot) {
    bot.end();
    bot = null;
    if (statusInterval) clearInterval(statusInterval);
    connectionStatus.textContent = 'Bot Bağlı Değil';
    connectionStatus.className = 'disconnected';
    return;
  }

  const serverIp = serverIpInput.value;
  const username = botUsernameInput.value;

  bot = mineflayer.createBot({
    host: serverIp,
    username: username,
    auth: 'offline',
    version: '1.18.2'
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    connectionStatus.textContent = 'Bot Bağlı - ' + serverIp;
    connectionStatus.className = 'connected';
    connectButton.textContent = 'Bağlantıyı Kes';

    // Pathfinder'ı başlat
    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);

    // 3D Görüntüleyiciyi başlat
    const container = document.getElementById('viewer-container');
    viewer = new Viewer(bot, container);

    // Durum güncellemelerini başlat
    if (statusInterval) clearInterval(statusInterval);
    statusInterval = setInterval(() => {
      if (bot && bot.entity) {
        botHealth.textContent = `${bot.health}/20`;
        botFood.textContent = `${bot.food}/20`;
        botPosition.textContent = `${Math.round(bot.entity.position.x)} ${Math.round(bot.entity.position.y)} ${Math.round(bot.entity.position.z)}`;
      }
    }, 1000);
  });

  bot.on('kicked', (reason) => {
    console.error('Bot sunucudan atıldı:', reason);
    connectionStatus.textContent = 'Bot Atıldı';
    connectionStatus.className = 'disconnected';
    connectButton.textContent = 'Sunucuya Bağlan';
    if (statusInterval) clearInterval(statusInterval);
  });

  bot.on('end', (reason) => {
    console.log('Bot bağlantısı sonlandı:', reason);
    connectionStatus.textContent = 'Bot Bağlı Değil';
    connectionStatus.className = 'disconnected';
    connectButton.textContent = 'Sunucuya Bağlan';
    if (statusInterval) clearInterval(statusInterval);
    bot = null;
  });

  bot.on('error', (err) => {
    console.error('Bot hatası:', err);
  });
});

// Hareket kontrollerini bağlama
moveForward.addEventListener('mousedown', () => setControlState('forward', true));
moveForward.addEventListener('mouseup', () => setControlState('forward', false));
moveForward.addEventListener('mouseleave', () => setControlState('forward', false));

moveBack.addEventListener('mousedown', () => setControlState('back', true));
moveBack.addEventListener('mouseup', () => setControlState('back', false));
moveBack.addEventListener('mouseleave', () => setControlState('back', false));

moveLeft.addEventListener('mousedown', () => setControlState('left', true));
moveLeft.addEventListener('mouseup', () => setControlState('left', false));
moveLeft.addEventListener('mouseleave', () => setControlState('left', false));

moveRight.addEventListener('mousedown', () => setControlState('right', true));
moveRight.addEventListener('mouseup', () => setControlState('right', false));
moveRight.addEventListener('mouseleave', () => setControlState('right', false));

actionJump.addEventListener('click', () => {
  if (bot) {
    bot.setControlState('jump', true);
    setTimeout(() => bot.setControlState('jump', false), 100);
  }
});

actionSneak.addEventListener('mousedown', () => setControlState('sneak', true));
actionSneak.addEventListener('mouseup', () => setControlState('sneak', false));
actionSneak.addEventListener('mouseleave', () => setControlState('sneak', false));

actionAttack.addEventListener('click', () => {
  if (!bot) return;
  const entity = bot.entityAtCursor();
  if (entity) bot.attack(entity);
});

actionUse.addEventListener('click', () => {
  if (bot) bot.activateItem();
});
