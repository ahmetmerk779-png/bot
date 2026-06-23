const fs = require('fs-extra'); // 'fs-extra' paketini kullanıyoruz
const path = require('path');

const BACKUP_DIR = './backups';

function saveSnapshot(sourceDir) {
    const timestamp = Date.now();
    const destination = path.join(BACKUP_DIR, timestamp.toString());
    fs.copySync(sourceDir, destination);
    return timestamp;
}

function restoreFromSnapshot(timestamp) {
    const source = path.join(BACKUP_DIR, timestamp.toString());
    fs.copySync(source, './src'); // Mevcut kodun üzerine yaz
}
