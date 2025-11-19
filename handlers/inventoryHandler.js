import Inventory from "../models/inventory.model.js";
import User from "../models/user.model.js";
import Item from "../models/item.model.js";
import { EmbedBuilder } from "discord.js";
import { wrapMessage } from "../utils.js";

async function showInventory(interaction, res) {
  const userId = interaction.member.user.id;
  try {
    // 使用 .lean() 讓查詢結果回傳一個純粹的 JavaScript 物件，以提高效能
    const user = await User.findOne({ userId }).lean();
    if (!user) {
      return res.send(wrapMessage(4, "尚未建立玩家", 0));
    }
    const userInventory = await Inventory.findOne({ userId }).lean();
    if (!userInventory) {
      return res.send(wrapMessage(4, "查無道具欄，請洽管理員", 0));
    }

    let inventoryContent = "空空如也";
    // 先找道具欄，再根據裡面的 itemID 從 Item collection 中查詢道具詳細資訊
    // 從中撈出 id 跟 name 做對應表 (Map 專門用來儲存 key-value pairs，查找快速)
    if (userInventory.items.length > 0) {
      const itemIds = userInventory.items.map((item) => item.itemId);
      const items = await Item.find({ itemId: { $in: itemIds } }).lean();
      const itemMap = new Map(items.map((item) => [item.itemId, item.name]));

      // 最後再掃一次道具欄，對照對應表組合出道具名稱跟數量輸出字串
      inventoryContent = userInventory.items
        .map((invItem) => {
          const itemDetails = itemMap.get(invItem.itemId);
          if (itemDetails) {
            return `${itemDetails} x ${invItem.quantity}`;
          }
          return `未知道具 (${invItem.itemId}) x ${invItem.quantity}`;
        })
        .join("\n");
    }

    const inventoryEmbed = new EmbedBuilder()
      .setColor("#F6C555")
      .setTitle(`**${user.characterName}** 的道具欄`)
      .setDescription(inventoryContent)
      .setFooter({ text: "欲查看道具請輸入 /item_detail" });

    return res.send(wrapMessage(4, "", 64, [inventoryEmbed]));
  } catch (err) {
    console.error("搜尋道具時發生錯誤:", err);
  }
}

export default showInventory;
