import { initializeMapCache } from "../services/mapCache.js";
import { setSymmetricalConnectionCost } from "../services/mapService.js";

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

export async function handleReloadMapCommand(interaction, res) {
  // 延遲回覆，確保 Discord 不會顯示 "interaction failed"
  res.json({ type: 6 });

  const webhookUrl = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;

  try {
    await initializeMapCache();

    await updateOriginalMessage(
      webhookUrl,
      "已成功從資料庫重新載入地圖路徑數據。/move 指令現在使用最新數據。",
      components
    );
  } catch (error) {
    console.error("地圖重新載入失敗：", error);
    await updateOriginalMessage(
      webhookUrl,
      `地圖重新載入失敗：${error.message}`,
      components
    );
  }
}

export async function handleSetMapConnectionCommand(interaction, res) {
  // 延遲回覆，確保 Discord 不會顯示 "interaction failed"
  res.json({ type: 6 });

  const webhookUrl = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;

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
      webhookUrl,
      `已成功設定地點 ${locationA} 與 ${locationB} 之間的連結，體力消耗為 ${cost}。`,
      []
    );
  } catch (error) {
    console.error("設定連結失敗：", error);
    await updateOriginalMessage(
      webhookUrl,
      `設定連結失敗：${error.message}`,
      components
    );
  }
}
