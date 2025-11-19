import Inventory from "../models/inventory.model.js";
import NPC from "../models/npc.model.js";
import Item from "../models/item.model.js";
import { updateOriginalMessage } from "../services/sendMessage.js";

async function handleCombatCommand(interaction, res) {
  res.json({
    type: 5, // Deferred Message Update
  });
  try {
    const userId = interaction.member.user.id;
    const custom_id = interaction.data.custom_id;
    const target_npcId = custom_id.split("_")[1];
    const action = custom_id.split("_")[2];

    console.log("custom_id:", custom_id);
    console.log("target_npcId:", target_npcId);
    console.log("action:", action);
    if (!target_npcId) {
      await updateOriginalMessage(interaction, "找不到目標敵人ID");
    }

    if (!action) {
      await updateOriginalMessage(interaction, "找不到動作");
    }

    const targetNpc = await NPC.findOne({ npcId: target_npcId });
    if (!targetNpc) {
      await updateOriginalMessage(interaction, "找不到目標敵人");
    }

    if (action === "fight") {
      await updateOriginalMessage(interaction, `你選擇攻擊${targetNpc.name}`);
    } else if (action === "toss") {
      const inventory = await Inventory.findOne({ userId }).lean();
      if (!inventory || !inventory.items || inventory.items.length === 0) {
        return await updateOriginalMessage(interaction, "背包是空的");
      }

      // 將背包中的道具 ID 和數量存入 Map
      const quantityMap = new Map();
      inventory.items.forEach((item) => {
        if (item.quantity > 0) {
          quantityMap.set(item.itemId, item.quantity);
        }
      });

      // 根據道具 ID 從資料庫中查詢道具詳細資訊
      const availableItems = await Item.find({
        itemId: { $in: inventory.items.map((item) => item.itemId) },
      }).lean();

      // 製作選項
      const options = availableItems.map((invItem) => {
        const quantity = quantityMap.get(invItem.itemId);
        return {
          label: `${invItem.name} (${quantity})`,
          value: invItem.itemId,
        };
      });

      if (options.length === 0) {
        return await updateOriginalMessage(interaction, "背包是空的");
      }

      const selectMenu = {
        type: 3, // 選單類型
        custom_id: `toss_item_${targetNpc.npcId}`, // 自訂ID，之後用來辨識
        options: options,
        placeholder: "選擇投擲物品",
      };
      const components = [{ type: 1, components: [selectMenu] }];
      return await updateOriginalMessage(interaction, "", components);
    } else if (action === "stroke") {
      await updateOriginalMessage(interaction, `你選擇撫摸${targetNpc.name}`);
    } else if (action === "feed") {
      await updateOriginalMessage(interaction, `你選擇餵食${targetNpc.name}`);
    } else if (action === "attract") {
      await updateOriginalMessage(interaction, `你選擇吸引${targetNpc.name}`);
    } else if (action === "run") {
      await updateOriginalMessage(
        interaction,
        `你選擇逃跑，離開${targetNpc.name}`
      );
    } else {
      await updateOriginalMessage(interaction, "不支援的動作");
    }
  } catch (error) {
    console.error("處理使用指令時發生錯誤:", error);
    await updateOriginalMessage(interaction, "處理使用指令時發生錯誤");
  }
}

export default handleCombatCommand;
