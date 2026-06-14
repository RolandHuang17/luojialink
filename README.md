# LuoJia Link

LuoJia Link（珞珈连点）是一个本地可演示的校园结伴微信小程序 MVP。

## 目录

- `miniprogram/`：微信小程序原生前端
- `server/`：Node.js + TypeScript + Express 后端
- `docs/`：项目基石文档、接口和演示材料

## 后端启动

```bash
cd server
npm install
npm run db:push
npm run db:seed
npm run dev
```

如果本机 `npm run db:push` 出现 Prisma schema engine 空错误，可以先用演示兜底命令初始化 SQLite：

```bash
npm run db:init
npm run db:seed
```

健康检查：

```text
http://127.0.0.1:3000/api/health
```

## 小程序

用微信开发者工具导入 `miniprogram/`，并在本地设置里开启“不校验合法域名”。

默认 API 地址：

```text
http://127.0.0.1:3000/api
```

## 演示账号

- `alice`：已完成注册，适合作为发布者。
- `bob`：已完成注册，适合作为申请者。
- `carol`：已完成注册，适合作为第三方/观察者。
- `newbie`：未完成注册，用于演示首次 onboarding。

## 当前演示闭环

- 首次注册 onboarding。
- 广场按吃饭、运动、自习、娱乐分类浏览。
- 发布想搭、保存草稿、草稿箱继续编辑/删除。
- 详情页查看完整规划、申请“想搭”、查看发布者主页。
- pending 申请进入消息页，申请通过前不能自由聊天。
- 通过后进入正式会话，可发送消息并互换联系方式。
- 微信号默认隐藏，双方互换后才展示。
- 日程页用红/蓝/绿展示自己发布、自己申请、已搭上的活动。
- 举报页可提交反馈。

## 验证

```bash
cd server
npm run build
npm test
```

小程序无法在命令行完整构建时，至少执行 JS/配置基础检查：

```powershell
Get-ChildItem -Path miniprogram\pages -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
Get-Content miniprogram\app.json -Encoding UTF8 | ConvertFrom-Json | Out-Null
```
