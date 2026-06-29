function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function distance(pos1, pos2) {
  return Math.sqrt(
    Math.pow(pos1.x - pos2.x, 2) +
    Math.pow(pos1.y - pos2.y, 2) +
    Math.pow(pos1.z - pos2.z, 2)
  );
}

function formatCoords(x, y, z) {
  return `${Math.round(x)}, ${Math.round(y)}, ${Math.round(z)}`;
}

function getDirection(angle) {
  const directions = ['kuzey', 'kuzeydoğu', 'doğu', 'güneydoğu', 'güney', 'güneybatı', 'batı', 'kuzeybatı'];
  const index = Math.round(((angle % (2 * Math.PI)) / (2 * Math.PI)) * 8) % 8;
  return directions[index];
}

module.exports = {
  sleep,
  randomInt,
  randomFloat,
  distance,
  formatCoords,
  getDirection
};
