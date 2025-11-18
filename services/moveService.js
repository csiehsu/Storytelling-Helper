import User from "../models/user.model.js";
import {
  hasEvent,
  getShortestPathFromCache,
  getLocationNamesCache,
} from "../services/mapCache.js";
import Location from "../models/location.model.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { updateOriginalMessage, sendFollowUpMessage } from "./sendMessage.js";

/**
 * 計算從起點到路徑上指定節點的累積消耗。
 * @param {Array<string>} fullPath - 完整路徑
 * @param {number} stopIndex - 停下的節點在路徑中的索引
 * @param {number} totalCost - 整個旅程的總消耗
 * @returns {number} - 累積消耗
 */
function calculateTraveledCost(fullPath, stopIndex, totalCost) {
  const stopId = fullPath[stopIndex];

  // 如果玩家在第一個節點停下，消耗為 0
  if (stopIndex === 0) return 0;

  // 查詢從停下點到終點的最短消耗 (C_SZ)
  const costToDestination = getShortestPathFromCache(
    stopId,
    fullPath[fullPath.length - 1]
  );

  if (!costToDestination) {
    // 這不應該發生，除非快取錯誤。如果發生，就返回總成本，讓玩家承擔。
    console.error(
      `無法計算子路徑成本：${stopId} 到 ${fullPath[fullPath.length - 1]}`
    );
    return totalCost;
  }

  // 累積消耗 (C_AS) = 總消耗 (C_AZ) - 剩餘消耗 (C_SZ)
  const traveledCost = totalCost - costToDestination.cost;
  return traveledCost;
}

/**
 * 處理移動流程中的下一步，包含事件檢查和互動暫停。
 * @param {object} interaction - Discord Interaction
 * @param {PlayerDocument} player - Mongoose Player 文件
 * @param {number} startIndex - 從路徑的哪個索引開始檢查 (通常為 1 或上次停下的位置+1)
 */
async function processMoveStep(interaction, player, startIndex) {
  const webhookUrl = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}`;
  const webhookOriginalUrl = webhookUrl + "/messages/@original";

  const { fullPath, destinationId, totalCost } = player.currentMove;
  const locationNamesCache = getLocationNamesCache();

  for (let i = startIndex; i < fullPath.length; i++) {
    const currentId = fullPath[i];
    const isDestination = currentId === destinationId;

    // 1. 計算累積消耗並檢查體力 (必須在每次循環開始時進行)
    const traveledCost = calculateTraveledCost(fullPath, i, totalCost);

    // 體力不足檢查：若無法走到 currentId，則停在前一個節點 (i-1)
    if (player.stamina < traveledCost) {
      const lastStopId = fullPath[i - 1];
      const lastTraveledCost = calculateTraveledCost(
        fullPath,
        i - 1,
        totalCost
      );

      await finalizeMove(player, lastStopId, lastTraveledCost);

      await updateOriginalMessage(
        webhookOriginalUrl,
        `扣除 ${lastTraveledCost} 點體力，剩餘 ${
          player.stamina - lastTraveledCost
        }。`
      );
      await sendFollowUpMessage(
        webhookUrl,
        `${player.characterName}的體力不足 ${traveledCost}，在 ${locationNamesCache[lastStopId]} 停下休息。`
      );
      return; // 流程結束
    }

    // 2. 取得當前地點的事件資訊
    let eventInfo = {};
    if (hasEvent(currentId)) {
      const location = await Location.findOne({ locationId: currentId });
      if (!location) {
        console.error(`找不到地點資料：${currentId}`);
        continue; // 繼續下一個節點
      }
      eventInfo = location.eventInfo || {};
    }

    // 事件與終點判斷邏輯
    if (isDestination) {
      // 若為終點，直接結算，不顯示按鈕
      const eventMessage = eventInfo.description
        ? `\n${eventInfo.description}`
        : "";
      await finalizeMove(player, destinationId, totalCost);
      await updateOriginalMessage(
        webhookOriginalUrl,
        `已扣除體力 ${totalCost} 點，剩餘 ${
          player.stamina - totalCost
        }。${eventMessage}`
      );
      await sendFollowUpMessage(
        webhookUrl,
        `${player.characterName}移動至${locationNamesCache[destinationId]}。`
      );
      return; // 流程結束
    } else if (hasEvent(currentId)) {
      // 處理非終點的事件
      if (eventInfo.forced) {
        // 強制事件，強制停下，不顯示按鈕
        await finalizeMove(player, currentId, traveledCost);
        await updateOriginalMessage(
          webhookOriginalUrl,
          `已扣除 ${traveledCost} 點體力，剩餘 ${
            player.stamina - traveledCost
          }。移動終止。`
        );
        await sendFollowUpMessage(
          webhookUrl,
          `${player.characterName}經過${locationNamesCache[currentId]}時，${eventInfo.description}\n看來是無法再前進了。`
        );
        return; // 流程結束
      } else {
        // 非強制事件，顯示按鈕等待互動
        // 儲存當前暫停狀態 (下次從 i+1 開始)
        // player.currentMove.currentIndex = i;
        // await player.save();

        // 建立按鈕
        const moveButton = new ButtonBuilder()
          .setCustomId(`move_select_continue_${destinationId}`)
          .setLabel("前進")
          .setStyle(ButtonStyle.Success);
        const stopButton = new ButtonBuilder()
          .setCustomId(`move_select_stop`)
          .setLabel("停下")
          .setStyle(ButtonStyle.Secondary);
        const actionRow = new ActionRowBuilder().addComponents(
          moveButton,
          stopButton
        );
        await finalizeMove(player, currentId, traveledCost);
        // 顯示互動選項
        await updateOriginalMessage(
          webhookOriginalUrl,
          `目前已耗費 ${traveledCost} 點體力，剩餘 ${
            player.stamina - traveledCost
          }。`,
          [actionRow]
        );
        await sendFollowUpMessage(
          webhookUrl,
          `${player.characterName}經過${locationNamesCache[currentId]}時，${eventInfo.description}`
        );
        return;
      }
    }
    // 若無事件且非終點，繼續下一個節點
  }
}

/**
 * 最終結算移動結果。
 */
async function finalizeMove(player, finalLocationId, cost) {
  const finalPlayer = await User.findById(player._id);

  // 執行最終扣除體力與更新位置的原子操作
  await User.updateOne(
    { _id: player._id },
    {
      $inc: { stamina: -cost }, // 扣除消耗
      $set: { locationId: finalLocationId }, // 更新位置
      $unset: { currentMove: "" }, // 清除移動狀態
    }
  );
}

export default processMoveStep;
