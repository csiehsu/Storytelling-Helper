import User from "../models/user.model.js";
import Location from "../models/location.model.js";
import {
  getShortestPathFromCache,
  getLocationNamesCache,
} from "../services/mapCache.js";
import processMoveStep from "../services/moveService.js";
import {
  sendFollowUpMessage,
  updateOriginalMessage,
} from "../services/sendMessage.js";

async function handleMove(destinationId, interaction, res) {
  // 延遲回覆，確保 Discord 不會顯示 "interaction failed"
  res.json({ type: 6 });
  const webhookUrl = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;

  try {
    const userId = interaction.member.user.id;
    const user = await User.findOne({ userId });
    if (!user) {
      await updateOriginalMessage(webhookUrl, "查無玩家，無法移動。", []);
      return;
    }
    const currentLocationId = user.locationId;
    const locationNamesCache = getLocationNamesCache();
    const currentLocationName = locationNamesCache[currentLocationId];
    const selectedLocationName = locationNamesCache[destinationId];
    const pathResult = getShortestPathFromCache(
      currentLocationId,
      destinationId
    );

    if (!pathResult || !pathResult.path) {
      await updateOriginalMessage(
        webhookUrl,
        `無法從 ${currentLocationName} 移動到 ${selectedLocationName}。`,
        []
      );
      return;
    }
    const staminaCost = pathResult.cost;
    if (user.stamina < staminaCost) {
      await updateOriginalMessage(
        webhookUrl,
        `體力不足，無法移動到 ${selectedLocationName}。需要 ${staminaCost} 點體力，現有 ${user.stamina} 點。`,
        []
      );
      return;
    }

    // 更新玩家狀態 (啟動移動)
    user.currentMove = {
      isMoving: true,
      fullPath: pathResult.path,
      currentIndex: 0,
      destinationId: destinationId,
      totalCost: pathResult.cost,
    };
    await user.save();

    // 從第一步開始檢查 (因為 0 是起點)
    await processMoveStep(interaction, user, 1);
  } catch (error) {
    console.error("處理移動選單時發生錯誤:", error);
    await updateOriginalMessage(webhookUrl, "處理移動選單時發生錯誤。", []);
  }
}

export async function showMoveCommand(interaction, res) {
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

    // 取得玩家已知的地點（不含玩家所在地）
    const knownLocations = user.knownLocations;
    const locations = await Location.find({
      locationId: { $in: knownLocations, $ne: user.locationId },
    });

    // 建立下拉式選單選項
    const options = locations.map((loc) => ({
      label: `${loc.name}`,
      description: `${
        getShortestPathFromCache(user.locationId, loc.locationId).cost
      } 體力`,
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
        content: `請選擇移動地點。目前體力：${user.stamina}。目前所在地：${
          getLocationNamesCache()[user.locationId]
        }`,
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

export async function handleMoveSelectMenu(interaction, res) {
  const selectedLocationId =
    interaction.data.values && interaction.data.values[0];
  if (!selectedLocationId) {
    return res.json({
      type: 4,
      data: {
        content: "未選擇有效的地點",
        flags: 64,
      },
    });
  }
  await handleMove(selectedLocationId, interaction, res);
}

export async function handleMoveContinue(interaction, res) {
  const customId = interaction.data.custom_id;
  const destinationId = customId.split("move_continue_")[1];
  if (!destinationId) {
    return res.json({
      type: 4,
      data: {
        content: "無效的繼續移動請求",
        flags: 64,
      },
    });
  }
  await handleMove(destinationId, interaction, res);
}

export async function handleMoveStop(interaction, res) {
  // 延遲回覆，確保 Discord 不會顯示 "interaction failed"
  res.json({ type: 6 });
  const webhookUrl = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;
  const apiUrl = `https://discord.com/api/v10/channels/${interaction.channel_id}/messages`;

  try {
    const locationNamesCache = getLocationNamesCache();
    const userId = interaction.member.user.id;
    const user = await User.findOne({ userId });
    if (!user) {
      await updateOriginalMessage(webhookUrl, "查無玩家，無法停止移動。");
      return;
    }
    await fetch(webhookUrl, {
      method: "DELETE",
    });
    await sendFollowUpMessage(
      apiUrl,
      `${user.characterName}選擇在 ${
        locationNamesCache[user.locationId]
      } 停下腳步。`
    );
    return;
  } catch (error) {
    console.error("處理停止移動時發生錯誤:", error);
    await updateOriginalMessage(webhookUrl, "處理停止移動時發生錯誤。");
  }
}
