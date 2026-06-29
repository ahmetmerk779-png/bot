// Mevcut socket.io bağlantısı ve diğer fonksiyonlar...

// Keşif butonuna tıklandığında
document.getElementById('exploreBtn')?.addEventListener('click', () => {
  const command = '/explore'; // veya doğal dil: "Keşfet"
  sendCommand(command);
});

// Keşif durdurma butonu
document.getElementById('stopExploreBtn')?.addEventListener('click', () => {
  const command = '/explore durdur';
  sendCommand(command);
});

// Keşfedilen yerleri listeleme
function updateDiscoveries(discoveries) {
  const list = document.getElementById('discoveriesList');
  if (!list) return;
  list.innerHTML = discoveries.map(d => 
    `<li>${d.name} - Koordinat: ${d.coords.join(', ')} (${new Date(d.timestamp).toLocaleString()})</li>`
  ).join('');
}

// Socket.io ile keşif verilerini dinle
socket.on('discoveriesUpdate', (data) => {
  updateDiscoveries(data);
});
