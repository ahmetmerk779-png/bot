// Mevcut socket.io bağlantısı ve diğer fonksiyonlar...

// Koordinatları söyle
document.getElementById('sayCoordsBtn')?.addEventListener('click', () => {
  const command = `/coords söyle`;
  sendCommand(command);
});

// Koordinatları bir oyuncuya mesaj olarak gönder
document.getElementById('msgCoordsBtn')?.addEventListener('click', () => {
  const target = document.getElementById('coordsTarget')?.value;
  if (!target) return alert('Hedef oyuncu adı girin.');
  const command = `/coords mesaj ${target}`;
  sendCommand(command);
});

// TPA isteği gönder
document.getElementById('tpaBtn')?.addEventListener('click', () => {
  const target = document.getElementById('tpaTarget')?.value;
  if (!target) return alert('Hedef oyuncu adı girin.');
  const command = `/coords tpa ${target}`;
  sendCommand(command);
});

// TPA kabul et
document.getElementById('tpacceptBtn')?.addEventListener('click', () => {
  const command = `/coords tpaccept`;
  sendCommand(command);
});

// TPA reddet
document.getElementById('tpdenyBtn')?.addEventListener('click', () => {
  const command = `/coords tpdeny`;
  sendCommand(command);
});

// Oyuncuları listele
document.getElementById('listPlayersBtn')?.addEventListener('click', () => {
  const command = `/coords oyuncular`;
  sendCommand(command);
});

// En yakın oyuncuyu bul
document.getElementById('nearestPlayerBtn')?.addEventListener('click', () => {
  const command = `/coords en yakın`;
  sendCommand(command);
});

// Bir oyuncuya git (TPA + takip et)
document.getElementById('goToPlayerBtn')?.addEventListener('click', () => {
  const target = document.getElementById('goToTarget')?.value;
  if (!target) return alert('Hedef oyuncu adı girin.');
  const command = `/coords gel ${target}`;
  sendCommand(command);
});

// Socket.io ile gelen oyuncu listesini güncelleme
socket.on('playersUpdate', (players) => {
  const list = document.getElementById('onlinePlayersList');
  if (!list) return;
  list.innerHTML = players.map(p => `<li>${p.name} - ${p.distance ? p.distance.toFixed(1) + ' blok' : 'Görüş alanında değil'}</li>`).join('');
});
