import { updateOriginalMessage } from "../services/sendMessage.js";

async function handleCraftUpdate(interaction, res) {
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

export default handleCraftUpdate;
