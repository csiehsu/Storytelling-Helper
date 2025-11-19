import Item from "../models/item.model.js";
import NPC from "../models/npc.model.js";
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import {
  updateOriginalMessage,
  sendFollowUpMessage,
} from "../services/sendMessage.js";

async function handleSayCommand(interaction, res) {
  res.json({
    type: 5, // Deferred Message Update
  });
  try {
    const options = interaction.data.options;
    // 0: 戰鬥遭遇, 1: 發現道具, 2: 其他純文字
    const messageType = Number(
      options.find((opt) => opt.name === "類型").value
    );
    const messageInfo = options.find((opt) => opt.name === "顯示資訊").value;
    const messageTitles = ["遭到攻擊", "發現道具", ""];
    let imageUrl;
    let embedFields;
    let components;

    if (messageType === 2) {
      await updateOriginalMessage(interaction, messageInfo);
    } else if (messageType === 0) {
      const enemy = await NPC.findOne({ name: messageInfo });
      if (!enemy) {
        await updateOriginalMessage(interaction, "查無此敵人");
      }
      imageUrl =
        enemy.imageUrl ||
        "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgfS0in6gMHuhY1eRKdE2CmIlqajSj9_cartdRsYtaysGlttPkJi5RjEdJKB1-FQ1M2MtsSgI3ctEcpM2sIVnZJEq64K5VpyV-A1NVbtahoJNLy1kihk-wO3AaH2vzWv_4_8BL7iAy_NgBh/s800/pose_mark_hashiru_guruguru.png";

      embedFields = [
        { name: enemy.name, value: "", inline: false },
        { name: "", value: enemy.description || "", inline: false },
      ];

      const fightButton = new ButtonBuilder()
        .setCustomId(`combat_${enemy.npcId}_fight`)
        .setLabel("攻擊")
        .setStyle(ButtonStyle.Danger);
      const tossButton = new ButtonBuilder()
        .setCustomId(`combat_${enemy.npcId}_toss`)
        .setLabel("投擲")
        .setStyle(ButtonStyle.Success);
      const strokeButton = new ButtonBuilder()
        .setCustomId(`combat_${enemy.npcId}_stroke`)
        .setLabel("撫摸")
        .setStyle(ButtonStyle.Success);
      const feedButton = new ButtonBuilder()
        .setCustomId(`combat_${enemy.npcId}_feed`)
        .setLabel("餵食")
        .setStyle(ButtonStyle.Success);
      const attractButton = new ButtonBuilder()
        .setCustomId(`combat_${enemy.npcId}_attract`)
        .setLabel("吸引")
        .setStyle(ButtonStyle.Success);
      const runButton = new ButtonBuilder()
        .setCustomId(`combat_${enemy.npcId}_run`)
        .setLabel("逃跑")
        .setStyle(ButtonStyle.Secondary);

      const actionRow1 = new ActionRowBuilder().addComponents(
        tossButton
        // strokeButton,
        // feedButton,
        // attractButton
      );
      const actionRow2 = new ActionRowBuilder().addComponents(
        fightButton,
        runButton
      );
      components = [actionRow1, actionRow2];
    } else if (messageType === 1) {
      const item = await Item.findOne({ name: messageInfo });
      if (!item) {
        await updateOriginalMessage(interaction, "查無此道具");
      }

      imageUrl = item.imageUrl || "";
      embedFields = [
        { name: item.name, value: "", inline: false },
        { name: "", value: item.description || "", inline: false },
      ];

      const getButton = new ButtonBuilder()
        .setCustomId(`get_${item.itemId}`)
        .setLabel("獲得")
        .setStyle(ButtonStyle.Success);

      const actionRow = new ActionRowBuilder().addComponents(getButton);
      components = [actionRow];
    } else {
      await updateOriginalMessage(interaction, "類型選項錯誤");
    }

    const embed = new EmbedBuilder()
      .setColor("#51A8DD")
      .setTitle(messageTitles[messageType])
      .setImage(imageUrl)
      .addFields(embedFields);

    await fetch(
      `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
      {
        method: "DELETE",
      }
    );
    await sendFollowUpMessage(interaction, "", components, embed);
  } catch (error) {
    console.error("處理使用指令時發生錯誤:", error);
    await updateOriginalMessage(interaction, "處理使用指令時發生錯誤");
  }
}

export default handleSayCommand;
