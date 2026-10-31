import { world } from "@minecraft/server";

export const DEFAULT_EMC = {
  "minecraft:dirt": 1, "minecraft:cobblestone": 1, "minecraft:coal": 128,
  "minecraft:iron_ingot": 256, "minecraft:gold_ingot": 2048, "minecraft:diamond": 8192,
  "minecraft:emerald": 16384, "minecraft:nether_star": 139264
};

const DYNAMIC_EMC_KEY = "tt:dynamic_emc";
const BLACKLIST_KEY = "tt:blacklist";

function getDynamicTable() {
  const str = world.getDynamicProperty(DYNAMIC_EMC_KEY);
  return str ? JSON.parse(str) : {};
}

export function getItemEMC(itemId) {
  const table = getDynamicTable();
  return table[itemId] ?? DEFAULT_EMC[itemId] ?? 0;
}

export function setItemEMC(itemId, value) {
  const table = getDynamicTable();
  table[itemId] = value;
  world.setDynamicProperty(DYNAMIC_EMC_KEY, JSON.stringify(table));
}

export function resetItemEMC(itemId) {
  const table = getDynamicTable();
  if (table[itemId] !== undefined) {
    delete table[itemId];
    world.setDynamicProperty(DYNAMIC_EMC_KEY, JSON.stringify(table));
  }
}

export function resetAllEMC() {
  world.setDynamicProperty(DYNAMIC_EMC_KEY, undefined);
}

export function getBlacklist() {
  const str = world.getDynamicProperty(BLACKLIST_KEY);
  return str ? JSON.parse(str) : [];
}

export function addToBlacklist(itemId) {
  const list = getBlacklist();
  if (!list.includes(itemId)) {
    list.push(itemId);
    world.setDynamicProperty(BLACKLIST_KEY, JSON.stringify(list));
  }
}

export function removeFromBlacklist(itemId) {
  const list = getBlacklist().filter(id => id !== itemId);
  world.setDynamicProperty(BLACKLIST_KEY, JSON.stringify(list));
}

export function isBlacklisted(itemId) {
  return getBlacklist().includes(itemId);
}

export function calculateItemEMC(item) {
  const baseEMC = getItemEMC(item.typeId);
  if (baseEMC <= 0) return 0;
  let totalEMC = baseEMC * item.amount;
  const durabilityComp = item.getComponent("minecraft:durability");
  if (durabilityComp) {
    const currentDurability = durabilityComp.maxDurability - durabilityComp.damage;
    if (currentDurability <= 0) return 0;
    const ratio = currentDurability / durabilityComp.maxDurability;
    totalEMC = Math.floor(totalEMC * ratio);
  }
  const enchantComp = item.getComponent("minecraft:enchantable");
  if (enchantComp) {
    const enchantments = enchantComp.getEnchantments();
    let enchantBonus = 0;
    for (const ench of enchantments) {
      enchantBonus += (baseEMC * 0.5) * ench.level;
    }
    totalEMC += Math.floor(enchantBonus * item.amount);
  }
  return totalEMC;
}
