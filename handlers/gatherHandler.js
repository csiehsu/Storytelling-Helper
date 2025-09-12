import Item from "../models/item.model.js";
import Inventory from "../models/inventory.model.js";

async function gatherHandler(interaction, itemId, res) {
  // 步驟 1: 在 3 秒內立即回覆一個延遲訊息，避免超時。另外一個作用是等等才能編輯這個訊息。
  res.json({
    type: 6, // 回覆類型 6: 延遲更新
  });

  try {
    const item = await Item.findOne({ itemId }).lean();
    // 不要 lean 因為後面還要存東西
    const inventory = await Inventory.findOne({
      userId: interaction.member.user.id,
    });
    const webhookUrl = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;
    if (!item || !inventory) {
      // 這裡不直接回覆 res.json，因為已經延遲了
      await fetch(webhookUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "資料錯誤，請聯絡管理員。",
          components: [], // 移除選單
        }),
      });
      return;
    }

    const embed = {
      title: "採集成功！",
      description: `你採集到了 **${item.name}**！`,
      color: 0x5865f2,
      image: {
        url: item.imageUrl,
      },
      footer: {
        text: "欲查看詳細內容請輸入 /item_detail",
      },
    };

    // 加入道具到使用者的背包
    const existingItem = inventory.items.find(
      (invItem) => invItem.itemId === itemId
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      inventory.items.push({ itemId: itemId, quantity: 1 });
    }
    await inventory.save();

    const body = {
      embeds: [embed],
      components: [],
    };

    // 編輯原本的訊息
    await fetch(webhookUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("處理選單互動時發生錯誤:", error);
    await fetch(webhookUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "處理請求時發生了錯誤。",
        components: [],
      }),
    });
  }
}

export default gatherHandler;
