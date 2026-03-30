// index.js içine eklenecek Radar Mantığı
setInterval(() => {
    if (!bot || !bot.entity) return;
    
    // Etraftaki blokları tara (32x32 alan)
    const size = 16;
    let mapData = [];
    for (let x = -size; x < size; x++) {
        for (let z = -size; z < size; z++) {
            const block = bot.blockAt(bot.entity.position.offset(x, 0, z));
            // Basit renk kodları: 0: Hava/Boş, 1: Engel, 2: Su/Lav
            mapData.push(block && block.type !== 0 ? 1 : 0);
        }
    }

    socket.emit('radar-data', {
        map: mapData,
        yaw: bot.entity.yaw, // Bakış yönü
        players: Object.values(bot.entities)
            .filter(e => e.type === 'player' && e !== bot.entity)
            .map(e => ({ 
                x: Math.round(e.position.x - bot.entity.position.x), 
                z: Math.round(e.position.z - bot.entity.position.z) 
            }))
    });
}, 1500); // Radar her 1.5 saniyede bir güncellenir
