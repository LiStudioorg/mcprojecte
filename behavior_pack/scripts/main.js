import { world, system } from "@minecraft/server";
import { openMainUI } from "./ui/ui_manager.js";
import { initAdminCommands } from "./system/admin.js";

initAdminCommands();

world.beforeEvents.itemUse.subscribe((event) => {
  if (event.itemStack?.typeId === "tt:portable_table") {
    system.run(() => openMainUI(event.source));
  }
});

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  if (event.block?.typeId === "tt:transmutation_table") {
    system.run(() => openMainUI(event.player));
  }
});
