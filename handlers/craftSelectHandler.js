import Recipe from "../models/recipe.model.js";
import User from "../models/user.model.js";
import Inventory from "../models/inventory.model.js";
import Item from "../models/item.model.js";
import Building from "../models/building.model.js";

async function updateOriginalMessage(webhookUrl, text, components = []) {
  await fetch(webhookUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: text,
      components: components, // 移除選單
    }),
  });
  return;
}
async function handleRecipeSelect(interaction, res) {
  // 在 3 秒內立即回覆一個延遲訊息，避免超時。另外一個作用是等等才能編輯這個訊息。
  res.json({
    type: 6, // 回覆類型 6: 延遲更新
  });

  const webhookUrl = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;

  try {
    const userId = interaction.member.user.id;
    const locationId = interaction.channel_id;
    const selectedRecipeId = interaction.data.values[0];
    const [recipe, inventory, user] = await Promise.all([
      Recipe.findOne({ recipeId: selectedRecipeId }).lean(),
      Inventory.findOne({ userId }).lean(),
      User.findOne({ userId }).lean(),
    ]);
    if (!recipe || !recipe.name || !recipe.name.en) {
      return await updateOriginalMessage(webhookUrl, "找不到該配方");
    }
    if (!inventory) {
      return await updateOriginalMessage(webhookUrl, "查無道具欄");
    }
    if (!user.learnedRecipes.includes(selectedRecipeId)) {
      return await updateOriginalMessage(webhookUrl, "尚未學會此配方");
    }

    // 檢查該地點是否有要求的工具

    if (recipe.requiredToolTypes && recipe.requiredToolTypes.length > 0) {
      for (const type of recipe.requiredToolTypes) {
        const requiredToolInstance = await Building.findOne({
          type: type,
          locationId: locationId,
          available: true,
        }).lean();

        // 如果缺少任何一個，立即回報錯誤並結束
        if (!requiredToolInstance) {
          return await updateOriginalMessage(webhookUrl, `缺少${type}工具`);
        }
      }
    }

    // 對照 Items, Inventory 和 Recipe，列出可用的選項
    let shortage = false;
    const components = [];

    for (const reqItem of recipe.requiredItems) {
      // 依需求 type 順序，找出 inventory 中 type 符合需求的
      const availableItems = await Item.find({
        itemId: { $in: inventory.items.map((item) => item.itemId) },
        type: reqItem.type,
      }).lean();

      // 缺少材料直接中斷製作
      if (availableItems.length === 0) {
        shortage = true;
        break;
      }

      // 製作選項
      // 遍歷玩家的道具欄，將每個道具的 itemId 和數量存入 Map
      const itemQuantities = new Map();
      inventory.items.forEach((item) => {
        itemQuantities.set(item.itemId, item.quantity);
      });

      // 組合 availableItems 和它們的數量
      const itemsWithQuantities = availableItems.map((item) => {
        const quantity = itemQuantities.get(item.itemId) || 0;
        return {
          ...item,
          quantity: quantity,
        };
      });

      // 製作選項
      const selectOptions = itemsWithQuantities.map((item) => ({
        label: `${item.name}（${item.quantity}可用）`,
        value: `${recipe.recipeId}:${item.itemId}`,
      }));

      const selectMenu = {
        type: 3,
        custom_id: `craft_material_select:${reqItem.type}`,
        placeholder: `請選擇${reqItem.type}類物品`,
        options: selectOptions,
      };

      components.push({ type: 1, components: [selectMenu] });
    }

    if (shortage) {
      return await updateOriginalMessage(
        webhookUrl,
        `缺少${reqItem.type}類型的材料`
      );
    }

    await updateOriginalMessage(webhookUrl, "請選擇材料：", components);
  } catch (error) {
    console.error("處理選單互動時發生錯誤:", error);
    await updateOriginalMessage(webhookUrl, "處理請求時發生了錯誤");
  }
}

export default handleRecipeSelect;
