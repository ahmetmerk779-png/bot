import fs from 'fs';

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function logToFile(filePath, data) {
  try {
    const dir = './data';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    const existing = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : [];
    existing.push({ time: Date.now(), ...data });
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
  } catch (err) {
    console.error('Dosyaya yazma hatası:', err.message);
  }
}

export function readFromFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error('Dosya okuma hatası:', err.message);
  }
  return [];
}
