export async function updateOriginalMessage(webhookUrl, text, components = []) {
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

export async function sendFollowUpMessage(webhookUrl, text, components = []) {
  if (!webhookUrl) {
    throw new Error("no webhook url.");
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // 將 JavaScript 物件轉換為 JSON 字串
      body: JSON.stringify({
        content: text,
        components: components,
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
