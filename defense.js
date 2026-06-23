// defense.js
function startDefense(bot) {
    bot.on('entityMoved', (entity) => {
        if (entity.type === 'player' && entity.username !== 'asmp_bot') {
            const dist = bot.entity.position.distanceTo(entity.position);
            if (dist < 10) {
                console.log(`[ALERT]: Yakınlarda tehdit! Mesafe: ${dist.toFixed(2)}`);
                bot.chat(`[God Mode Defense]: ${entity.username} uzaklaş!`);
                // Buraya kaçma protokolünü (Pathfinder.goto) ekleyebilirsin
            }
        }
    });
}
