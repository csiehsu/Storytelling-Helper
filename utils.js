import "dotenv/config";

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = "https://discord.com/api/v10/" + endpoint;
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  // Use fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      "Content-Type": "application/json; charset=UTF-8",
      "User-Agent":
        "DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)",
    },
    ...options,
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

export async function InstallGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: "PUT", body: commands });
  } catch (err) {
    console.error(err);
  }
}

export function validateStartParameters(name, str, spd, dex) {
  // 定義允許的字元：中文字、英文字母、數字、.、_、-、空格
  // 這裡使用 `\s` 代表所有空白字元，包括空格
  const allowedRegex = /^[\u4e00-\u9fa5a-zA-Z0-9.\s_-]+$/;
  // 檢查角色名稱是否符合正規表達式
  if (!allowedRegex.test(name)) {
    return "角色名稱只能包含中文、英文、數字、空格和._-";
  }
  if (name.length > 20) {
    return "角色名稱請勿超過20字";
  }
  if (
    !Number.isInteger(str) ||
    !Number.isInteger(spd) ||
    !Number.isInteger(dex) ||
    str < 1 ||
    spd < 1 ||
    dex < 1 ||
    str + spd + dex !== 30 ||
    str > 28 ||
    spd > 28 ||
    dex > 28
  ) {
    return "角色能力數值不合法，各項能力值須為正整數且總和須為30";
  }
}

export function wrapMessage(type, content, flag) {
  return {
    type: type, // 類型 4 代表 CHANNEL_MESSAGE_WITH_SOURCE
    data: {
      content: content,
      flags: flag, // 標記為 64 (EPHEMERAL)，讓訊息只有使用者自己看得到, 0 = DEFAULT
    },
  };
}
