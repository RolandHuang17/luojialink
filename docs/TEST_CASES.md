# 验收前测试清单

更新时间：2026-06-13

## 1. 后端自动化测试

在 `server/` 目录执行：

```bash
npm run build
npm test
```

通过标准：

- TypeScript 编译无错误。
- Vitest 全部通过。
- 不需要真实 AI Key。
- 不需要真实地图服务。

## 2. 启动检查

```bash
cd server
npm run db:seed
npm run dev
```

浏览器访问：

```text
http://127.0.0.1:3000/api/health
```

通过标准：

- 返回 `code: 0`。
- `status` 为 `ok`。

## 3. 小程序基础流程

- Alice 可以登录。
- Bob 可以登录。
- Carol 可以登录。
- 广场可以加载请求列表。
- 发布页可以创建新请求。
- 详情页可以展示请求信息。

## 4. 申请与匹配

- Bob 不能申请自己发布的请求。
- Bob 可以申请 Alice 的请求。
- Bob 重复申请同一请求会失败。
- Alice 可以在申请页看到 Bob 的申请。
- Carol 不能处理 Alice 的申请。
- Alice 接受申请后，请求状态变为已匹配。
- Alice 和 Bob 都能看到新会话。

## 5. 会话消息

- Alice 可以在会话中发送文本消息。
- Bob 可以看到 Alice 的消息。
- Bob 可以回复消息。
- Carol 看不到 Alice/Bob 的会话消息。
- 会话关闭后不能继续发送消息。

## 6. 日历与共同空闲

- Alice 可以保存 `available` 时间片。
- Bob 可以保存 `available` 时间片。
- 双方时间片有重叠时，会话页展示共同空闲。
- 双方时间片无重叠时，会话页展示空状态。
- 用户保存 `busy` 时间片后，请求详情页可以提示冲突。
- 冲突提示不阻止继续申请。

## 7. 智能建议与 POI

- 会话页选择会话后能看到智能建议。
- 智能建议包含：
  - 时间建议。
  - 地点建议。
  - 破冰话术。
  - 注意事项。
- 推荐地点列表可以展示本地 POI。
- 没有共同空闲时，推荐接口仍能返回回退建议。

## 8. 举报反馈

- 请求详情页可以进入举报页。
- 会话页可以进入举报页。
- 举报页能自动带入目标类型和目标 ID。
- 举报原因和补充说明可以填写。
- 提交成功后出现提示并返回上一页。
- 目标 ID 非法时不能提交。

## 9. Git 检查

提交前执行：

```bash
git status --short
```

不应提交：

- `.env`
- `server/prisma/*.db`
- `node_modules/`
- `dist/`
- `miniprogram/project.private.config.json`
- 根目录 `project.config.json`
- 根目录 `project.private.config.json`
- `~$*.docx`

建议提交信息：

```bash
git commit -m "feat: add ai poi report demo flow"
```
