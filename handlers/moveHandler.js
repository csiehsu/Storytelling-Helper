import User from "../models/user.model.js";
import Location from "../models/location.model.js";

async function handleMoveCommand(interaction, res) {
  try {
    const userId = interaction.member.user.id;
    const user = await User.findOne({ userId });

    if (!user) {
      return res.json({
        type: 4, // 回覆類型 4: CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: "查無玩家",
          flags: 64, // 讓訊息只有使用者自己看得到
        },
      });
    }

    // 取得玩家已知的地點
    const knownLocations = user.knownLocations;
    const locations = await Location.find({
      locationId: { $in: knownLocations },
    });

    // 建立下拉式選單選項
    const options = locations.map((loc) => ({
      label: loc.name,
      description: loc.description || "沒有描述",
      value: loc.locationId,
    }));
    const actionRow = {
      type: 1, // Action Row
      components: [
        {
          type: 3, // Select Menu
          custom_id: "move_select_menu",
          options: options,
          placeholder: "未選擇",
        },
      ],
    };
    // 直接回覆一個新訊息，包含下拉式選單
    return res.json({
      type: 4,
      data: {
        content: "請選擇移動地點",
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

export default handleMoveCommand;
