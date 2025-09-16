import User from "../models/user.model.js";
import Inventory from "../models/inventory.model.js";
import Item from "../models/item.model.js";

async function handleUseCommand(interaction, res) {
  try {
    const userId = interaction.member.user.id;
    const user = await User.findOne({ userId });
    const inventory = await Inventory.findOne({ userId }).lean();

    if (!user) {
      return res.json({
        type: 4, // 回覆類型 4: CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: "查無玩家",
          flags: 64, // 讓訊息只有使用者自己看得到
        },
      });
    }

    if (!inventory || inventory.items.length === 0) {
      return res.json({
        type: 4,
        data: {
          content: "道具欄為空",
          flags: 64,
        },
      });
    }

    // 過濾出數量大於 0 的道具 ID
    const itemIdsInInventory = inventory.items
      .filter((item) => item.quantity > 0)
      .map((item) => item.itemId);

    if (itemIdsInInventory.length === 0) {
      return res.json({
        type: 4,
        data: {
          content: "道具欄為空",
          flags: 64,
        },
      });
    }

    // 根據道具 ID 查詢道具詳細資訊
    const itemDetails = await Item.find({
      itemId: { $in: itemIdsInInventory },
    }).lean();

    // 動態生成下拉式選單的選項
    const selectOptions = itemDetails.map((item) => ({
      label: item.name,
      value: item.itemId, // 選項的值是道具 ID
    }));

    // 建立 ActionRow 和下拉式選單
    const selectMenu = {
      type: 3, // Select Menu
      custom_id: "use_item_select",
      placeholder: "未選擇",
      options: selectOptions,
    };

    const actionRow = {
      type: 1, // Action Row
      components: [selectMenu],
    };

    // 直接回覆一個新訊息，包含下拉式選單
    return res.json({
      type: 4,
      data: {
        content: "請選擇使用物品",
        components: [actionRow],
        flags: 64,
      },
    });
  } catch (error) {
    console.error("處理使用指令時發生錯誤:", error);
    res.json({
      type: 4,
      data: {
        content: "處理使用指令時發生錯誤",
        flags: 64,
      },
    });
  }
}

export default handleUseCommand;
