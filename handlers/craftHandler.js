// handlers/craftHandler.js
import User from "../models/user.model.js";
import Recipe from "../models/recipe.model.js";
import Inventory from "../models/inventory.model.js";
import Item from "../models/item.model.js";
import Building from "../models/building.model.js";
import conversions from "../constants/item-conversions.js";
import Location from "../models/location.model.js";
import { updateOriginalMessage } from "../services/sendMessage.js";

export async function showCraftRecipeMenu(interaction, res) {
  try {
    const userId = interaction.member.user.id;
    const user = await User.findOne({ userId });

    if (!user || !user.learnedRecipes || user.learnedRecipes.length === 0) {
      res.json({
        type: 4, // 回覆類型 4: CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: "還沒有學過任何配方",
          flags: 64, // 讓訊息只有使用者自己看得到
        },
      });
      return;
    }

    // 根據玩家學會的配方ID，去 Recipe 模型中查詢配方名稱
    const learnedRecipeDetails = await Recipe.find({
      recipeId: { $in: user.learnedRecipes },
    }).lean();

    // 建立下拉式選單和 ActionRow
    const selectOptions = learnedRecipeDetails.map((recipe) => ({
      label: recipe.name.ch,
      value: recipe.recipeId,
    }));

    const selectMenu = {
      type: 3, // SelectMenu
      custom_id: `craft_select`,
      placeholder: "未選擇",
      options: selectOptions,
    };

    const actionRow = {
      type: 1, // ActionRow
      components: [selectMenu],
    };

    // 回覆包含選單的訊息
    res.json({
      type: 4, // 回覆類型 4: CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        content: "請選擇製作項目",
        flags: 64, // 讓訊息只有使用者自己看得到
        components: [actionRow],
      },
    });
  } catch (error) {
    console.error("處理製作指令時發生錯誤:", error);
    // 回覆錯誤訊息
    res.json({
      type: 4, // 回覆類型 4: CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        content: "處理製作指令時發生錯誤",
        flags: 64,
      },
    });
  }
}

export async function handleCraftProcess(interaction, res) {
  // 延遲回覆，確保 Discord 不會顯示 "interaction failed"
  res.json({ type: 6 });

  try {
    // 獲取使用者選擇的 custom_id
    // craft_submit:${itemId}*${quantity}=${outputItemId}*{${quantity}}
    const customId = interaction.data.custom_id;
    const userId = interaction.member.user.id;
    const craftStr = customId.split(":")[1];
    const [materialString, outputString] = craftStr.split("=");
    const [materialId, materialQuantityStr] = materialString.split("*");
    const [outputId, outputQuantityStr] = outputString.split("*");
    const materialQuantityInt = parseInt(materialQuantityStr, 10);
    const outputQuantityInt = parseInt(outputQuantityStr, 10);

    const inventory = await Inventory.findOne({ userId });
    if (!inventory) {
      await updateOriginalMessage(interaction, "找不到道具欄");
      return;
    }

    const materialIndex = inventory.items.findIndex(
      (item) => item.itemId === materialId
    );
    if (
      materialIndex === -1 ||
      inventory.items[materialIndex].quantity < materialQuantityInt
    ) {
      await updateOriginalMessage(interaction, "材料不足");
      return;
    }

    // 製作材料與產出的名稱對應
    const items = await Item.find({
      itemId: { $in: [materialId, outputId] },
    }).lean();

    const itemNamesMap = new Map();
    items.forEach((item) => {
      itemNamesMap.set(item.itemId, item.name);
    });

    // 進行扣除
    inventory.items[materialIndex].quantity -= materialQuantityInt;
    if (inventory.items[materialIndex].quantity <= 0) {
      inventory.items.splice(materialIndex, 1);
    }

    // 進行增加
    const outputIndex = inventory.items.findIndex(
      (item) => item.itemId === outputId
    );
    if (outputIndex !== -1) {
      // 如果產出物已存在，更新數量
      inventory.items[outputIndex].quantity += outputQuantityInt;
    } else {
      // 否則，新增產出物到陣列中
      inventory.items.push({
        itemId: outputId,
        quantity: outputQuantityInt,
      });
    }

    // 保存更新後的道具欄
    await inventory.save();
    await updateOriginalMessage(
      interaction,
      `已消耗 ${materialQuantityInt} ${itemNamesMap.get(
        materialId
      )}製作 ${outputQuantityInt} ${itemNamesMap.get(outputId)}`
    );
  } catch (error) {
    console.error("處理選單互動時發生錯誤:", error);
    await updateOriginalMessage(interaction, "處理請求時發生了錯誤");
  }
}

export async function showCraftMaterialMenu(interaction, res) {
  res.json({ type: 6 });

  try {
    const userId = interaction.member.user.id;
    const channelId = interaction.channel_id;
    const selectedRecipeId = interaction.data.values[0];
    const [recipe, inventory, user, location] = await Promise.all([
      Recipe.findOne({ recipeId: selectedRecipeId }).lean(),
      Inventory.findOne({ userId }).lean(),
      User.findOne({ userId }).lean(),
      Location.findOne({ channelId: channelId }),
    ]);
    const locationId = location.locationId;
    if (!recipe || !recipe.name || !recipe.name.en) {
      return await updateOriginalMessage(interaction, "找不到該配方");
    }
    if (!inventory) {
      return await updateOriginalMessage(interaction, "查無道具欄");
    }
    if (!user.learnedRecipes.includes(selectedRecipeId)) {
      return await updateOriginalMessage(interaction, "尚未學會此配方");
    }
    if (!locationId) {
      return await updateOriginalMessage(interaction, "位於未知的地點");
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
          return await updateOriginalMessage(interaction, `缺少${type}工具`);
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

      const actionRow = {
        type: 1, // ActionRow
        components: [selectMenu],
      };
      components.push(actionRow);
    }

    if (shortage) {
      return await updateOriginalMessage(
        interaction,
        `缺少${reqItem.type}類型的材料`
      );
    }

    return await updateOriginalMessage(interaction, "請選擇材料：", components);
  } catch (error) {
    console.error("處理選單互動時發生錯誤:", error);
    return await updateOriginalMessage(interaction, "處理請求時發生了錯誤");
  }
}

export async function confirmCraft(interaction, res) {
  // 延遲回覆，確保 Discord 不會顯示 "interaction failed"
  res.json({ type: 6 });

  try {
    // 獲取使用者選擇的 custom_id 和值
    // // craft_material_select:${reqItem.type}
    // const customId = interaction.data.custom_id;
    // `${recipe.recipeId}:${item.itemId}*${quantity}`
    const selectedValue = interaction.data.values[0];
    const [recipeAndItem, quantityString] = selectedValue.split("*");
    const [recipeId, itemId] = recipeAndItem.split(":");
    const quantity = parseInt(quantityString, 10);

    // 最終的製作按鈕
    const components = [];
    const outputItemId = conversions[recipeId][itemId];
    const outputItem = await Item.findOne({ itemId: outputItemId }).lean();
    const craftButton = {
      type: 2,
      style: 1,
      label: "製作",
      custom_id: `craft_submit:${itemId}*${quantity}=${outputItemId}*${quantity}`,
    };
    components.push({ type: 1, components: [craftButton] });

    await updateOriginalMessage(
      interaction,
      `是否確定製作${outputItem.name} x ${quantity}`,
      components
    );
  } catch (error) {
    console.error("處理選單互動時發生錯誤:", error);
    await updateOriginalMessage(interaction, "處理請求時發生了錯誤");
  }
}

export async function showCraftQuantityMenu(interaction, res) {
  // 延遲回覆，確保 Discord 不會顯示 "interaction failed"
  res.json({ type: 6 });

  try {
    // 獲取使用者選擇的 custom_id 和值
    // // craft_material_select:${reqItem.type}
    // const customId = interaction.data.custom_id;
    // `${recipe.recipeId}:${item.itemId}`
    const selectedValue = interaction.data.values[0];

    // 加上製作數量選項
    const components = [];
    const quantityOptions = [];
    for (let i = 0; i < 20; i++) {
      quantityOptions.push({
        label: `${i + 1}`,
        value: `${selectedValue}*${i + 1}`,
      });
    }

    const quantityMenu = {
      type: 3,
      custom_id: `craft_quantity_select`,
      placeholder: "選擇製作數量...",
      options: quantityOptions,
    };
    components.push({ type: 1, components: [quantityMenu] });

    await updateOriginalMessage(interaction, "請選擇數量：", components);
  } catch (error) {
    console.error("處理選單互動時發生錯誤:", error);
    await updateOriginalMessage(interaction, "處理請求時發生了錯誤");
  }
}
