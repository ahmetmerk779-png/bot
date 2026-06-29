// Mevcut socket.io bağlantısı ve diğer fonksiyonlar...

// Koordinat Paylaş
document.getElementById('shareCoordsBtn')?.addEventListener('click', () => {
  const target = document.getElementById('shareTarget')?.value || '';
  const command = target ? `/share ${target}` : '/share';
  sendCommand(command);
});

// TPA At
document.getElementById('tpaBtn')?.addEventListener('click', () => {
  const target = document.getElementById('tpaTarget')?.value;
  if (!target) return alert('TPA atılacak oyuncu adını girin.');
  const command = `/tpa ${target}`;
  sendCommand(command);
});

// TPA Kabul
document.getElementById('tpacceptBtn')?.addEventListener('click', () => {
  sendCommand('/tpaccept');
});

// TPA Reddet
document.getElementById('tpdenyBtn')?.addEventListener('click', () => {
  sendCommand('/tpdeny');
});

// Konum Sorgula
document.getElementById('whereBtn')?.addEventListener('click', () => {
  sendCommand('/where');
});

// Yakındaki Oyuncular
document.getElementById('nearbyBtn')?.addEventListener('click', () => {
  const radius = document.getElementById('nearbyRadius')?.value || 50;
  sendCommand(`/nearby ${radius}`);
});

// Koordinat Kaydet
document.getElementById('logCoordsBtn')?.addEventListener('click', () => {
  const note = document.getElementById('logNote')?.value || '';
  const command = note ? `/log ${note}` : '/log';
  sendCommand(command);
});

// Koordinat Kayıtlarını Listele
document.getElementById('listLogsBtn')?.addEventListener('click', () => {
  sendCommand('/listlogs');
});

// GPS Sorgula
document.getElementById('gpsBtn')?.addEventListener('click', () => {
  const target = document.getElementById('gpsTarget')?.value;
  if (!target) return alert('Waypoint adı veya koordinat girin.');
  sendCommand(`/gps ${target}`);
});

// Socket.io ile koordinat kayıtlarını güncelleme
socket.on('coordsLogUpdate', (data) => {
  const list = document.getElementById('coordsLogsList');
  if (!list) return;
  list.innerHTML = data.slice(-10).map(l => 
    `<li>${new Date(l.timestamp).toLocaleString()}: ${l.coords.join(', ')} - ${l.note} (${l.dimension})</li>`
  ).join('');
});
