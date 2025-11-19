import { initializeMapCache } from "../services/mapCache.js";
import { setSymmetricalConnectionCost } from "../services/mapService.js";
import { updateOriginalMessage } from "../services/sendMessage.js";

export async function handleReloadMapCommand(interaction, res) {
  // 延遲回覆，確保 Discord 不會顯示 "interaction failed"
  res.json({ type: 6 });

  try {
    await initializeMapCache();

    await updateOriginalMessage(
      interaction,
      "已成功從資料庫重新載入地圖路徑數據。/move 指令現在使用最新數據。"
    );
  } catch (error) {
    console.error("地圖重新載入失敗：", error);
    await updateOriginalMessage(
      interaction,
      `地圖重新載入失敗：${error.message}`
    );
  }
}

export async function handleSetMapConnectionCommand(interaction, res) {
  // 延遲回覆，確保 Discord 不會顯示 "interaction failed"
  res.json({ type: 6 });

  try {
    const options = interaction.data.options;
    const locationA = options.find((opt) => opt.name === "地點A_ID").value;
    const locationB = options.find((opt) => opt.name === "地點B_ID").value;
    const cost = parseInt(
      options.find((opt) => opt.name === "體力消耗").value,
      10
    );
    await setSymmetricalConnectionCost(locationA, locationB, cost);

    await updateOriginalMessage(
      interaction,
      `已成功設定地點 ${locationA} 與 ${locationB} 之間的連結，體力消耗為 ${cost}。`
    );
  } catch (error) {
    console.error("設定連結失敗：", error);
    await updateOriginalMessage(interaction, `設定連結失敗：${error.message}`);
  }
}
