import Item from "../models/item.model.js";
import Inventory from "../models/inventory.model.js";
import Location from "../models/location.model.js";
import { updateOriginalMessage } from "../services/sendMessage.js";
import { wrapMessage } from "../utils.js";
import { ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";

export async function handleGatherSelect(interaction, itemId, res) {
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

    if (!item || !inventory) {
      // 這裡不直接回覆 res.json，因為已經延遲了
      await updateOriginalMessage(interaction, "資料錯誤，請聯絡管理員。");
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

    // 編輯原本的訊息
    await updateOriginalMessage(interaction, "", [], embed);
  } catch (error) {
    console.error("處理選單互動時發生錯誤:", error);
    await updateOriginalMessage(interaction, "處理請求時發生了錯誤");
  }
}

export async function showGatherMenu(interaction, res) {
  try {
    const channelId = interaction.channel_id;
    const location = await Location.findOne({ channelId }).lean();
    if (
      !location ||
      !location.gatherables ||
      location.gatherables.length === 0
    ) {
      return res.send(wrapMessage(4, "無法在此採集", 64));
    }

    const items = await Item.find({
      itemId: { $in: location.gatherables.map((g) => g.itemId) },
    }).lean();
    if (items.length === 0) {
      return res.send(wrapMessage(4, "未找到可採集的物品", 64));
    }

    // 建立下拉式選單的選項
    const options = items.map((item) => ({
      label: item.name,
      value: item.itemId,
      description: `機率：${
        location.gatherables.find((g) => g.itemId === item.itemId).chance
      }%`,
    }));
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("gather_select")
        .setPlaceholder("未選擇")
        .addOptions(options)
    );

    return res.send({
      type: 4,
      data: {
        content: "請選擇要採集的資源：",
        components: [row.toJSON()],
      },
    });
  } catch (err) {
    console.error("採集資源時發生錯誤:", err);
  }
}
