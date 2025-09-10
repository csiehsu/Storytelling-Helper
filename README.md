# 使用工具

- nodeJS
- [Discord app](https://discord.com/developers/applications)
- [ngrok](https://ngrok.com/)

# env 資料

### Discord

`APP_ID`、`DISCORD_TOKEN`、`PUBLIC_KEY`
[資料都在這](https://discord.com/developers/applications/).

### MongoDB

`MONGODB_URI`

# 執行步驟

git clone https://github.com/csiehsu/Storytelling-Helper.git

cd Storytelling-Helper

npm install

npm run register （可能需要等幾分鐘才能註冊 Command，等不到就重開 DC

ngrok http 3000

node app.js

複製 ngrok terminal 顯示的 `https` 開頭的 forwarding address，到 [app's settings](https://discord.com/developers/applications)的 **General Information** 頁，找到 **Interactions Endpoint URL**，貼上並在後面加上 `/interactions`。（例如`https://1234-someurl.ngrok.io/interactions`）

如果無法 Save 記得先 node app.js

# 指令一覽

| Command        | Description       |
| -------------- | ----------------- |
| `/start`       | Create character. |
| `/inventory`   | Check inventory.  |
| `/item_detail` | Create item.      |
