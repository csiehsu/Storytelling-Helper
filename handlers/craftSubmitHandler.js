import conversions from "../item-conversions.js";
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

async function handleCraftSubmit(interaction, res) {
  // 延遲回覆，確保 Discord 不會顯示 "interaction failed"
  res.json({ type: 6 });

  const webhookUrl = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;

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
    console.log(conversions);
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
      webhookUrl,
      `是否確定製作${outputItem.name} x ${quantity}`,
      components
    );
  } catch (error) {
    console.error("處理選單互動時發生錯誤:", error);
    await updateOriginalMessage(webhookUrl, "處理請求時發生了錯誤");
  }
}

export default handleCraftSubmit;
