const move = require('./move');
const mine = require('./mine');
const combat = require('./combat');
const craft = require('./craft');
const useCraftingTable = require('./useCraftingTable');
const observe = require('./observe');
const explore = require('./explore');
const waypoint = require('./waypoint');
const share = require('./share');      // YENİ
const plan = require('./plan');

module.exports = {
  move,
  mine,
  combat,
  craft,
  useCraftingTable,
  observe,
  explore,
  waypoint,
  share,       // YENİ
  plan
};
