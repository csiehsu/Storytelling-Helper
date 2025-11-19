import User from "../models/user.model.js";
import Inventory from "../models/inventory.model.js";
import Item from "../models/item.model.js";
import { updateOriginalMessage } from "../services/sendMessage.js";

// 從玩家道具欄扣除道具並套用效果
async function useItem(userId, itemId, quantityToUse) {
  const [user, inventory, itemDetails] = await Promise.all([
    User.findOne({ userId }),
    Inventory.findOne({ userId }),
    Item.findOne({ itemId }).lean(),
  ]);

  if (!user || !inventory || !itemDetails) {
    return "發生錯誤，無法使用道具";
  }

  const inventoryItemIndex = inventory.items.findIndex(
    (item) => item.itemId === itemId
  );
  if (
    inventoryItemIndex === -1 ||
    inventory.items[inventoryItemIndex].quantity < quantityToUse
  ) {
    return "道具數量不足";
  }

  // 扣除道具數量
  inventory.items[inventoryItemIndex].quantity -= quantityToUse;
  if (inventory.items[inventoryItemIndex].quantity <= 0) {
    inventory.items.splice(inventoryItemIndex, 1);
  }

  let outputStr = "";
  if (itemDetails.nutrition) {
    // 增加 stats
    for (const stat in itemDetails.nutrition) {
      // 增加玩家 stats 和 hp/mp
      if (stat === "hp") {
        user.currentHp = Math.min(
          (user.currentHp * 10 +
            itemDetails.nutrition.hp * quantityToUse * 10) /
            10,
          user.stats.maxHp
        );
        outputStr += `，目前 HP：${user.currentHp}`;
      } else if (stat === "mp") {
        user.currentMp = Math.min(
          (user.currentMp * 10 +
            itemDetails.nutrition.mp * quantityToUse * 10) /
            10,
          user.stats.maxMp
        );
        outputStr += `，目前 MP：${user.currentMp}`;
      } else if (user.stats[stat]) {
        user.stats[stat] =
          (user.stats[stat] * 10 +
            itemDetails.nutrition[stat] * quantityToUse * 10) /
          10;
        outputStr += `，目前 ${stat}：${user.stats[stat]}`;
      }
    }
  }

  await Promise.all([user.save(), inventory.save()]);

  return `已使用 ${quantityToUse} 個${itemDetails.name}${outputStr}`;
}

export async function handleUseItemSelect(interaction, res) {
  // 在 3 秒內立即回覆一個延遲訊息，避免超時。另外一個作用是等等才能編輯這個訊息。
  res.json({
    type: 6, // 回覆類型 6: 延遲更新
  });

  try {
    const userId = interaction.member.user.id;
    const selectedItemId = interaction.data.values[0];

    const [inventory, itemDetails] = await Promise.all([
      Inventory.findOne({ userId }).lean(),
      Item.findOne({ itemId: selectedItemId }).lean(),
    ]);

    if (!inventory || !itemDetails) {
      return await updateOriginalMessage(interaction, "找不到該道具或道具欄");
    }

    const inventoryItem = inventory.items.find(
      (item) => item.itemId === selectedItemId
    );
    const quantity = inventoryItem ? inventoryItem.quantity : 0;

    // 判斷數量
    if (quantity === 1) {
      // 數量為 1，直接使用
      const resultMessage = await useItem(userId, selectedItemId, 1);
      return await updateOriginalMessage(interaction, resultMessage);
    } else if (quantity > 1) {
      // 數量大於 1，顯示數量選單
      const quantityOptions = Array.from({ length: quantity }, (_, i) => ({
        label: `${i + 1}`,
        value: `${selectedItemId}:${i + 1}`, // 格式為 itemId:quantity
      }));

      const quantitySelectMenu = {
        type: 3,
        custom_id: "use_quantity_select",
        placeholder: `未選擇`,
        options: quantityOptions,
      };

      const actionRow = {
        type: 1,
        components: [quantitySelectMenu],
      };

      return await updateOriginalMessage(
        interaction,
        `請選擇${itemDetails.name}的使用數量：`,
        [actionRow]
      );
    }
  } catch (error) {
    console.error("處理選單互動時發生錯誤:", error);
    await updateOriginalMessage(interaction, "處理請求時發生了錯誤");
  }
}

export async function handleUseQuantitySelect(interaction, res) {
  // 立即回覆延遲訊息
  res.json({ type: 6 });

  try {
    const userId = interaction.member.user.id;
    const [selectedItemId, quantityString] =
      interaction.data.values[0].split(":");
    const quantity = parseInt(quantityString, 10);
    const resultMessage = await useItem(userId, selectedItemId, quantity);
    await updateOriginalMessage(interaction, resultMessage);
  } catch (error) {
    console.error("處理使用數量選擇時發生錯誤:", error);
    await updateOriginalMessage(interaction, "哎呀！處理指令時出了點問題。");
  }
}
