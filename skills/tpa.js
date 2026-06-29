async function execute(bot, params) {
  const playerName = params[0];
  if (!playerName) return 'TPA gönderilecek oyuncu adı belirtilmedi.';
  
  bot.chat(`/tpa ${playerName}`);
  return `${playerName}'a TPA gönderildi.`;
}

module.exports = { execute };
