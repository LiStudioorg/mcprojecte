import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { ItemStack } from "@minecraft/server";
import { calculateItemEMC, getItemEMC, isBlacklisted } from "../data/emc_database.js";
import { getPlayerEMC, setPlayerEMC, getPlayerKnowledge, learnItem } from "../data/player_store.js";

const ITEMS_PER_PAGE = 20;

export function openMainUI(player) {
  player.playSound("random.enderchest.open");
  const form = new ActionFormData()
    .title("转化桌")
    .body(`§e当前EMC: §a${getPlayerEMC(player)}`)
    .button("出售物品", "textures/ui/arrow_down")
    .button("购买物品", "textures/ui/arrow_up");
  form.show(player).then(res => {
    if (res.canceled) return;
    if (res.selection === 0) openSellUI(player, 1);
    if (res.selection === 1) openBuyUI(player, 1);
  });
}

function openSellUI(player, page) {
  const inv = player.getComponent("inventory").container;
  const sellableMap = new Map(); 
  for (let i = 0; i < inv.size; i++) {
    const item = inv.getItem(i);
    if (!item || isBlacklisted(item.typeId)) continue;
    if (calculateItemEMC(item) > 0) {
      if (!sellableMap.has(item.typeId)) sellableMap.set(item.typeId, { count: 0, sample: item });
      sellableMap.get(item.typeId).count += item.amount;
    }
  }
  if (sellableMap.size === 0) {
    player.playSound("note.bass");
    return player.sendMessage("§c背包里没有可出售的物品。");
  }
  const allIds = Array.from(sellableMap.keys());
  const totalPages = Math.ceil(allIds.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const pageIds = allIds.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const form = new ActionFormData().title(`出售 (第 ${page}/${totalPages} 页)`);
  pageIds.forEach(id => {
    const data = sellableMap.get(id);
    form.button(`${id.replace("minecraft:", "")}\n§7数量: ${data.count}`);
  });
  if (page > 1) form.button("上一页", "textures/ui/arrow_left");
  if (page < totalPages) form.button("下一页", "textures/ui/arrow_right");
  form.show(player).then(res => {
    if (res.canceled) return;
    if (page > 1 && res.selection === pageIds.length) return openSellUI(player, page - 1);
    if (page < totalPages && res.selection === pageIds.length + (page > 1 ? 1 : 0)) return openSellUI(player, page + 1);
    const selectedId = pageIds[res.selection];
    const maxCount = sellableMap.get(selectedId).count;
    openSellAmountUI(player, selectedId, maxCount, page);
  });
}

function openSellAmountUI(player, itemId, maxCount, returnPage) {
  const form = new ModalFormData()
    .title(`出售: ${itemId.replace("minecraft:", "")}`)
    .slider(`数量 (1 - ${maxCount})`, 1, maxCount, 1, 1)
    .submitButton("确认");
  form.show(player).then(res => {
    if (res.canceled) return openSellUI(player, returnPage);
    const amount = res.formValues[0];
    const inv = player.getComponent("inventory").container;
    let removed = 0, totalEMC = 0;
    for (let i = 0; i < inv.size && removed < amount; i++) {
      const item = inv.getItem(i);
      if (item && item.typeId === itemId) {
        const take = Math.min(item.amount, amount - removed);
        const singleItem = item.clone(); singleItem.amount = 1;
        totalEMC += calculateItemEMC(singleItem) * take;
        item.amount -= take;
        inv.setItem(i, item.amount > 0 ? item : undefined);
        removed += take;
      }
    }
    if (removed > 0) {
      setPlayerEMC(player, getPlayerEMC(player) + totalEMC);
      learnItem(player, itemId);
      player.playSound("random.orb");
      player.sendMessage(`§a出售 ${removed} 个物品，获得 ${totalEMC} EMC。`);
    }
  });
}

function openBuyUI(player, page) {
  const knowledge = getPlayerKnowledge(player);
  if (knowledge.length === 0) return player.sendMessage("§c你还没有学习任何物品。");
  const totalPages = Math.ceil(knowledge.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const pageIds = knowledge.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const form = new ActionFormData().title(`购买 (第 ${page}/${totalPages} 页)`);
  pageIds.forEach(id => {
    form.button(`${id.replace("minecraft:", "")}\n§7单价: ${getItemEMC(id)} EMC`);
  });
  if (page > 1) form.button("上一页", "textures/ui/arrow_left");
  if (page < totalPages) form.button("下一页", "textures/ui/arrow_right");
  form.show(player).then(res => {
    if (res.canceled) return;
    if (page > 1 && res.selection === pageIds.length) return openBuyUI(player, page - 1);
    if (page < totalPages && res.selection === pageIds.length + (page > 1 ? 1 : 0)) return openBuyUI(player, page + 1);
    const selectedId = pageIds[res.selection];
    openBuyAmountUI(player, selectedId, page);
  });
}

function openBuyAmountUI(player, itemId, returnPage) {
  const unitEMC = getItemEMC(itemId);
  const playerEMC = getPlayerEMC(player);
  let maxAffordable = Math.min(64, Math.floor(playerEMC / unitEMC)); 
  if (maxAffordable <= 0) {
    player.playSound("note.bass");
    return player.sendMessage("§c你的 EMC 不足。");
  }
  const form = new ModalFormData()
    .title(`购买: ${itemId.replace("minecraft:", "")}`)
    .slider(`数量 (1 - ${maxAffordable})`, 1, maxAffordable, 1, 1)
    .submitButton("确认");
  form.show(player).then(res => {
    if (res.canceled) return openBuyUI(player, returnPage);
    const amount = res.formValues[0];
    const cost = unitEMC * amount;
    const inv = player.getComponent("inventory").container;
    let emptySlots = 0;
    for (let i = 0; i < inv.size; i++) if (!inv.getItem(i)) emptySlots++;
    const requiredSlots = Math.ceil(amount / 64);
    if (emptySlots < requiredSlots) {
      player.playSound("note.bass");
      return player.sendMessage("§c背包已满，请清理后再购买！");
    }
    if (getPlayerEMC(player) >= cost) {
      setPlayerEMC(player, getPlayerEMC(player) - cost);
      inv.addItem(new ItemStack(itemId, amount));
      player.playSound("random.orb");
      player.sendMessage(`§a购买 ${amount} 个物品，花费 ${cost} EMC。`);
    }
  });
}
