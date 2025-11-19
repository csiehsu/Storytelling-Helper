export async function updateOriginalMessage(
  interaction,
  text,
  components = [],
  embed = null
) {
  const webhookUrl = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;
  await fetch(webhookUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: text,
      components: components, // 移除選單
      embeds: [embed],
    }),
  });
  return;
}

export async function sendFollowUpMessage(
  interaction,
  text,
  components = [],
  embed = null
) {
  const apiUrl = `https://discord.com/api/v10/channels/${interaction.channel_id}/messages`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`, // 使用 Bot Token 進行授權
      },
      // 將 JavaScript 物件轉換為 JSON 字串
      body: JSON.stringify({
        content: text,
        components: components,
        embeds: [embed],
      }),
    });

    // 檢查 HTTP 狀態碼
    if (!response.ok) {
      // 如果回應不是 2xx，嘗試讀取錯誤訊息
      const errorData = await response.json();
      console.error(
        "Discord Follow-up 訊息發送失敗 (HTTP Error):",
        response.status,
        errorData
      );

      throw new Error(
        `Failed to send follow-up message. Status: ${
          response.status
        }. Error: ${JSON.stringify(errorData)}`
      );
    }

    // 成功回應通常會返回創建的訊息物件
    return await response.json();
  } catch (error) {
    // 處理網路錯誤或解析錯誤
    console.error(
      "發送 Discord Follow-up 訊息失敗 (網路或解析錯誤):",
      error.message
    );
    throw error;
  }
}
