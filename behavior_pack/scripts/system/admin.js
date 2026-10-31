import { system, world } from "@minecraft/server";
import { setItemEMC, resetItemEMC, resetAllEMC, addToBlacklist, removeFromBlacklist, getItemEMC } from "../data/emc_database.js";
import { getPlayerEMC, setPlayerEMC } from "../data/player_store.js";

export function initAdminCommands() {
  system.afterEvents.scriptEventReceive.subscribe((event) => {
    const id = event.id;
    const msg = event.message.trim();
    const player = event.sourceEntity;
    if (!player || !player.isPlayer() || !player.isOp()) return;
    const heldItem = player.getComponent("equippable").getEquipment("Mainhand");

    if (id === "tt:set_emc") {
      const value = parseInt(msg);
      if (!heldItem || isNaN(value)) return player.sendMessage("§c用法错误。手持物品并输入数值。");
      setItemEMC(heldItem.typeId, value);
      player.sendMessage(`§a已修改 ${heldItem.typeId} 的 EMC 为 ${value}`);
    } else if (id === "tt:get_emc") {
      if (!heldItem) return;
      player.sendMessage(`§e当前物品 EMC: §a${getItemEMC(heldItem.typeId)}`);
    } else if (id === "tt:reset_emc") {
      if (!heldItem) return;
      resetItemEMC(heldItem.typeId);
      player.sendMessage(`§a已还原 ${heldItem.typeId} 为默认 EMC`);
    } else if (id === "tt:reset_all_emc") {
      resetAllEMC();
      world.sendMessage("§c[系统] 管理员重置了全服物价！");
    } else if (id === "tt:blacklist_add") {
      if (!heldItem) return;
      addToBlacklist(heldItem.typeId);
      player.sendMessage(`§c已将 ${heldItem.typeId} 加入黑名单，禁止出售。`);
    } else if (id === "tt:blacklist_remove") {
      if (!heldItem) return;
      removeFromBlacklist(heldItem.typeId);
      player.sendMessage(`§a已将 ${heldItem.typeId} 移出黑名单。`);
    } else if (id === "tt:give_emc" || id === "tt:take_emc") {
      const args = msg.split(" ");
      if (args.length < 2) return;
      const target = world.getPlayers().find(p => p.name === args[0]);
      const amount = parseInt(args[1]);
      if (!target || isNaN(amount)) return;
      const current = getPlayerEMC(target);
      if (id === "tt:give_emc") {
        setPlayerEMC(target, current + amount);
        player.sendMessage(`§a已给 ${target.name} 增加 ${amount} EMC`);
      } else {
        setPlayerEMC(target, Math.max(0, current - amount));
        player.sendMessage(`§c已扣除 ${target.name} ${amount} EMC`);
      }
    }
  });
}
