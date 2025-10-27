import Inventory from "../models/inventory.model.js";
import NPC from "../models/npc.model.js";
import Item from "../models/item.model.js";

async function updateOriginalMessage(webhookBaseUrl, text, components = []) {
  const webhookUrl = `${webhookBaseUrl}/messages/@original`;
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

async function handleCombatCommand(interaction, res) {
  const webhookBaseUrl = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}`;
  res.json({
    type: 5, // Deferred Message Update
  });
  try {
    const userId = interaction.member.user.id;
    const custom_id = interaction.data.custom_id;
    const target_npcId = custom_id.split("_")[1];
    const action = custom_id.split("_")[2];

    if (!target_npcId) {
      await updateOriginalMessage(webhookBaseUrl, "找不到目標敵人ID");
    }

    if (!action) {
      await updateOriginalMessage(webhookBaseUrl, "找不到動作");
    }

    const targetNpc = await NPC.findOne({ npcId: target_npcId });
    if (!targetNpc) {
      await updateOriginalMessage(webhookBaseUrl, "找不到目標敵人");
    }

    if (action === "fight") {
      await updateOriginalMessage(
        webhookBaseUrl,
        `你選擇攻擊${targetNpc.name}`
      );
    } else if (action === "toss") {
      const inventory = await Inventory.findOne({ userId }).lean();
      if (!inventory || !inventory.items || inventory.items.length === 0) {
        return await updateOriginalMessage(webhookBaseUrl, "背包是空的");
      }

      const availableItems = await Item.find({
        itemId: { $in: inventory.items.map((item) => item.itemId) },
      }).lean();

      const options = availableItems.map((invItem) => {
        return {
          label: invItem.name,
          value: invItem.itemId,
        };
      });

      if (options.length === 0) {
        return await updateOriginalMessage(webhookBaseUrl, "背包是空的");
      }

      const selectMenu = {
        type: 3, // 選單類型
        custom_id: `toss_item_${targetNpc.npcId}`, // 自訂ID，之後用來辨識
        options: options,
        placeholder: "選擇投擲物品",
      };
      const components = [{ type: 1, components: [selectMenu] }];
      return await updateOriginalMessage(webhookBaseUrl, "", components);
    } else if (action === "stroke") {
      await updateOriginalMessage(
        webhookBaseUrl,
        `你選擇撫摸${targetNpc.name}`
      );
    } else if (action === "feed") {
      await updateOriginalMessage(
        webhookBaseUrl,
        `你選擇餵食${targetNpc.name}`
      );
    } else if (action === "attract") {
      await updateOriginalMessage(
        webhookBaseUrl,
        `你選擇吸引${targetNpc.name}`
      );
    } else if (action === "run") {
      await updateOriginalMessage(
        webhookBaseUrl,
        `你選擇逃跑，離開${targetNpc.name}`
      );
    } else {
      await updateOriginalMessage(webhookBaseUrl, "不支援的動作");
    }
  } catch (error) {
    console.error("處理使用指令時發生錯誤:", error);
    await updateOriginalMessage(webhookBaseUrl, "處理使用指令時發生錯誤");
  }
}

export default handleCombatCommand;
