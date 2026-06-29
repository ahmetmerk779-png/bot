// Mevcut socket.io bağlantısı ve diğer fonksiyonlar...

// 1. Konum Paylaşma
document.getElementById('shareLocationBtn')?.addEventListener('click', () => {
  const target = document.getElementById('shareLocationTarget')?.value;
  const command = `/shareLocation konum ${target}`.trim();
  sendCommand(command);
});

// 2. Neredesin?
document.getElementById('whereBtn')?.addEventListener('click', () => {
  const target = document.getElementById('whereTarget')?.value;
  const command = `/shareLocation nerede ${target}`.trim();
  sendCommand(command);
});

// 3. TPA At
document.getElementById('tpaBtn')?.addEventListener('click', () => {
  const target = document.getElementById('tpaTarget')?.value;
  if (!target) return alert('Oyuncu adı girin.');
  const command = `/shareLocation tpa ${target}`;
  sendCommand(command);
});

// 4. TPA Kabul
document.getElementById('tpacceptBtn')?.addEventListener('click', () => {
  const command = `/shareLocation tpaccept`;
  sendCommand(command);
});

// 5. TPA Reddet
document.getElementById('tpadenyBtn')?.addEventListener('click', () => {
  const command = `/shareLocation tpadeny`;
  sendCommand(command);
});

// 6. Çağır (Bana gel)
document.getElementById('callBtn')?.addEventListener('click', () => {
  const target = document.getElementById('callTarget')?.value;
  if (!target) return alert('Oyuncu adı girin.');
  const command = `/shareLocation çağır ${target}`;
  sendCommand(command);
});

// 7. Waypoint konumu paylaş
document.getElementById('shareWaypointBtn')?.addEventListener('click', () => {
  const wpName = document.getElementById('shareWaypointName')?.value;
  if (!wpName) return alert('Waypoint adı girin.');
  const command = `/shareLocation waypoint ${wpName}`;
  sendCommand(command);
});
