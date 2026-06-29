// Mevcut socket.io bağlantısı ve diğer fonksiyonlar...

// Branch Mining Başlat
document.getElementById('startBranchMineBtn')?.addEventListener('click', () => {
  const length = document.getElementById('branchLength')?.value || 50;
  const branches = document.getElementById('branchCount')?.value || 5;
  const direction = document.getElementById('branchDirection')?.value || 'kuzey';
  const command = `/branchMine ${length} ${branches} ${direction}`;
  sendCommand(command);
});

// Branch Mining Durdur
document.getElementById('stopBranchMineBtn')?.addEventListener('click', () => {
  const command = `/branchMine durdur`;
  sendCommand(command);
});

// Branch Mining ilerlemesini güncelleme (socket.io ile)
socket.on('branchMineProgress', (data) => {
  const progressBar = document.getElementById('branchMineProgress');
  const progressText = document.getElementById('branchMineText');
  if (progressBar && data.progress !== undefined) {
    progressBar.style.width = `${data.progress}%`;
    progressBar.textContent = `${data.progress}%`;
    progressText.textContent = `Dal: ${data.currentBranch}/${data.totalBranches}`;
  }
});
