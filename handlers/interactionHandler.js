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

async function handleTossCommand(interaction, res) {
  const webhookBaseUrl = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}`;
  res.json({
    type: 5, // Deferred Message Update
  });
  try {
    const userId = interaction.member.user.id;
    const custom_id = interaction.data.custom_id;
    // custom_id 格式: toss_item_${npcId}
    const target_npcId = custom_id.split("_")[2];
    // options 格式: [itemId]
    const itemId = interaction.data.values[0];

    if (!target_npcId) {
      await updateOriginalMessage(webhookBaseUrl, "找不到目標敵人ID");
    }

    const targetNpc = await NPC.findOne({ npcId: target_npcId });
    if (!targetNpc) {
      await updateOriginalMessage(webhookBaseUrl, "找不到目標敵人");
    }

    const inventory = await Inventory.findOne({ userId });
    if (!inventory || !inventory.items || inventory.items.length === 0) {
      await updateOriginalMessage(webhookBaseUrl, "背包是空的");
    }
    const itemIndex = inventory.items.findIndex(
      (invItem) => invItem.itemId === itemId
    );
    if (itemIndex === -1 || inventory.items[itemIndex].quantity <= 0) {
      await updateOriginalMessage(webhookBaseUrl, "背包中沒有這個道具");
    }

    const item = await Item.findOne({ itemId }).lean();
    if (!item) {
      await updateOriginalMessage(webhookBaseUrl, "無此道具");
    }

    if (!item.smell || item.smell.type === "none" || item.smell.level === 0) {
      await updateOriginalMessage(
        webhookBaseUrl,
        `${targetNpc.name}被${item.name}嚇了一跳，迅速轉身離開。從地上撿回了${item.name}`
      );
    }

    let likeLevel = 0;
    targetNpc.likes.smells.forEach((likeSmell) => {
      if (likeSmell.type === item.smell.type) {
        likeLevel = 5 - Math.abs(item.smell.level - likeSmell.level);
      }
    });

    if (likeLevel > 0) {
      // 從背包中移除道具
      inventory.items[itemIndex].quantity -= 1;
      if (inventory.items[itemIndex].quantity === 0) {
        inventory.items.splice(itemIndex, 1);
      }
      await inventory.save();
    }

    const resultStr = `${targetNpc.name}的好感度 + ${likeLevel}。\n失去了 1 個${item.name}`;
    if (likeLevel === 5) {
      await updateOriginalMessage(
        webhookBaseUrl,
        `${targetNpc.name}衝上去接住了${item.name}，津津有味地品嚐起來，完全失去了戒心。\n${resultStr}。`
      );
    } else if (likeLevel === 4) {
      await updateOriginalMessage(
        webhookBaseUrl,
        `${targetNpc.name}好奇地走向${item.name}，聞了一聞便品嚐起來，偶爾抬頭警戒著你。\n${resultStr}`
      );
    } else if (likeLevel === 3) {
      await updateOriginalMessage(
        webhookBaseUrl,
        `${targetNpc.name}的視線在你與${item.name}之間來回，但終究沒有任何行動。\n${resultStr}`
      );
    } else if (likeLevel === 2) {
      await updateOriginalMessage(
        webhookBaseUrl,
        `${targetNpc.name}警戒地看著你猶豫了一下，最後迅速地叼走${item.name}，躲進一旁的草叢裡。\n${resultStr}`
      );
    } else if (likeLevel === 1) {
      await updateOriginalMessage(
        webhookBaseUrl,
        `${targetNpc.name}先是被${item.name}嚇了一跳，接著迅速地叼走${item.name}，一溜煙就不見了蹤影。\n${resultStr}`
      );
    } else {
      await updateOriginalMessage(
        webhookBaseUrl,
        `${targetNpc.name}被${item.name}嚇了一跳，迅速轉身離開。從地上撿回了${item.name}`
      );
    }
  } catch (error) {
    console.error("處理使用指令時發生錯誤:", error);
    await updateOriginalMessage(
      webhookBaseUrl,
      `處理使用指令時發生錯誤：${error}`
    );
  }
}

export default handleTossCommand;
