export function getPlayerEMC(player) {
  return player.getDynamicProperty("tt:emc") ?? 0;
}
export function setPlayerEMC(player, amount) {
  player.setDynamicProperty("tt:emc", Math.max(0, Math.floor(amount)));
}
export function getPlayerKnowledge(player) {
  const str = player.getDynamicProperty("tt:knowledge") ?? "[]";
  try { return JSON.parse(str); } catch { return []; }
}
export function learnItem(player, itemId) {
  const knowledge = getPlayerKnowledge(player);
  if (!knowledge.includes(itemId)) {
    knowledge.push(itemId);
    player.setDynamicProperty("tt:knowledge", JSON.stringify(knowledge));
  }
}
export function hasLearned(player, itemId) {
  return getPlayerKnowledge(player).includes(itemId);
}
