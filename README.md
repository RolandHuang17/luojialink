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
