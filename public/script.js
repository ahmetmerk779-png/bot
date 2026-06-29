// Mevcut socket.io bağlantısı ve diğer fonksiyonlar...

// Waypoint Ekle
document.getElementById('addWaypointBtn')?.addEventListener('click', () => {
  const name = document.getElementById('waypointName')?.value || 'hedef';
  const x = document.getElementById('waypointX')?.value || 0;
  const y = document.getElementById('waypointY')?.value || 64;
  const z = document.getElementById('waypointZ')?.value || 0;
  const command = `/waypoint add ${name} ${x} ${y} ${z}`;
  sendCommand(command);
});

// Waypoint Git
document.getElementById('goWaypointBtn')?.addEventListener('click', () => {
  const name = document.getElementById('waypointGoName')?.value;
  if (!name) return alert('Waypoint adı girin.');
  const command = `/waypoint go ${name}`;
  sendCommand(command);
});

// Waypoint Listele
document.getElementById('listWaypointsBtn')?.addEventListener('click', () => {
  const command = `/waypoint list`;
  sendCommand(command);
});

// Mevcut konumu waypoint olarak kaydet (kısayol)
document.getElementById('saveCurrentPosBtn')?.addEventListener('click', () => {
  const name = document.getElementById('waypointName')?.value || 'hedef';
  const command = `/waypoint ${name}`;
  sendCommand(command);
});

// Waypoint Sil
document.getElementById('deleteWaypointBtn')?.addEventListener('click', () => {
  const name = document.getElementById('waypointDeleteName')?.value;
  if (!name) return alert('Waypoint adı girin.');
  const command = `/waypoint delete ${name}`;
  sendCommand(command);
});

// Waypoint listesini güncelleme (socket.io ile)
socket.on('waypointsUpdate', (data) => {
  const list = document.getElementById('waypointsList');
  if (!list) return;
  list.innerHTML = data.map(w => 
    `<li><strong>${w.name}</strong> - Koordinat: ${w.coords.join(', ')} (${new Date(w.timestamp).toLocaleString()})</li>`
  ).join('');
});
