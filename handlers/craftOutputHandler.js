import Inventory from "../models/inventory.model.js";
import Item from "../models/item.model.js";

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

async function handleCraftOutput(interaction, res) {
  // 延遲回覆，確保 Discord 不會顯示 "interaction failed"
  res.json({ type: 6 });

  const webhookUrl = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;

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
    console.log(inventory);
    console.log(materialId);
    console.log(materialQuantityInt);
    if (!inventory) {
      await updateOriginalMessage(webhookUrl, "找不到道具欄");
      return;
    }

    const materialIndex = inventory.items.findIndex(
      (item) => item.itemId === materialId
    );
    console.log(materialIndex);
    if (
      materialIndex === -1 ||
      inventory.items[materialIndex].quantity < materialQuantityInt
    ) {
      await updateOriginalMessage(webhookUrl, "材料不足");
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
      webhookUrl,
      `已消耗 ${materialQuantityInt} ${itemNamesMap.get(
        materialId
      )}製作 ${outputQuantityInt} ${itemNamesMap.get(outputId)}`
    );
  } catch (error) {
    console.error("處理選單互動時發生錯誤:", error);
    await updateOriginalMessage(webhookUrl, "處理請求時發生了錯誤");
  }
}

export default handleCraftOutput;
