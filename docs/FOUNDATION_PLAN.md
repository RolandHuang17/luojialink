# LuoJia Link 本地 MVP 开发基石方案

更新时间：2026-06-13  
验收目标日：2026-06-17  
项目阶段：本地可演示微信小程序 MVP  

## 1. 一句话目标

LuoJia Link（珞珈连点）要在 5 天内完成一个本地可运行、可演示、可复现的微信小程序 MVP：学生模拟登录后，能够匿名发布校园结伴请求，其他学生申请“想搭”，发起者确认后进入临时会话，并通过日历、匹配分和 AI/模板破冰建议降低沟通成本。

本阶段只追求稳定演示和核心闭环，不追求正式上线。

## 2. 当前结论

现有文档已经明确了产品方向，但原始范围偏大。5 天内必须把需求切成三层：

- P0：验收必须通过的业务闭环。
- P1：增强演示说服力的功能。
- P2：只做可降级演示，不依赖真实外部服务。

所有开发默认遵守这份基石方案。后续如果需求冲突，以“演示稳定、闭环完整、外部依赖可降级”为最高优先级。

## 3. 产品定位

### 3.1 目标用户

武汉大学在校学生，尤其是有临时结伴需求但不想承担高主动沟通成本的学生。

典型场景：

- 约饭
- 运动
- 自习
- 观影
- 剧院/活动
- 临时拼单

### 3.2 核心价值

- 用模拟校内身份建立可信边界。
- 用匿名发布降低公开表达压力。
- 用标签和空闲时间提高匹配效率。
- 用双向确认避免单方面打扰。
- 用临时会话和 AI/模板建议减少破冰成本。

### 3.3 不做成什么

本阶段不做开放互联网社交平台，不做陌生人泛聊天，不做正式运营系统，不做真实审核上线产品。

## 4. 演示主流程

验收演示必须能稳定走完以下流程：

1. 打开微信开发者工具，进入小程序。
2. 使用测试账号 A 模拟登录。
3. A 维护资料和兴趣标签。
4. A 发布一条匿名结伴请求，例如“今晚 18:30 工学部附近约饭”。
5. 切换测试账号 B 模拟登录。
6. B 在广场看到 A 的请求，查看详情。
7. B 点击“想搭”，提交申请。
8. 切回 A。
9. A 在申请列表看到 B 的有限资料、共同标签、共同空闲和匹配分。
10. A 确认申请。
11. 系统创建临时会话。
12. A/B 在会话中发送消息。
13. 会话页展示 2-3 条 AI/模板破冰建议。
14. 日历页展示可用时间、共同空闲和冲突提示。
15. 用户可以对请求或会话提交举报记录。

## 5. 功能边界

### 5.1 P0 必做

P0 是最低通过标准，不能被牺牲。

| 模块 | 必做能力 | 验收标准 |
| --- | --- | --- |
| 模拟登录 | 固定测试账号登录，返回 token 和用户资料 | A/B 两个账号可切换登录 |
| 用户资料 | 学院、年级、昵称、兴趣标签维护 | 标签能保存并参与展示/匹配 |
| 广场列表 | 展示未过期请求卡片 | 能看到匿名编号、类型、时间、地点、费用、剩余时间 |
| 发布请求 | 创建结伴请求 | 支持活动类型、时间、地点、费用、匿名、失效时间、描述 |
| 请求详情 | 查看单条请求 | 能展示详情并提供“想搭”入口 |
| 想搭申请 | 申请参与别人的请求 | 防止重复申请和自己申请自己 |
| 申请处理 | 发起者确认/拒绝申请 | 确认后创建临时会话 |
| 临时会话 | 会话列表、消息列表、发送文本 | 会话仅双方可访问 |
| 基础举报 | 对请求/会话提交举报 | 能保存举报记录 |
| 演示数据 | 固定 seed 数据 | 一键重置演示环境 |

### 5.2 P1 尽量做

P1 是增强演示质量的功能，但不能影响 P0 稳定性。

| 模块 | 能力 | 降级方式 |
| --- | --- | --- |
| 智能日历 | 用户维护空闲时间片 | 如果涂抹交互来不及，先用时间段表单 |
| 共同空闲 | 计算双方时间交集 | 如果算法复杂，先按同日半小时粒度计算 |
| 冲突提示 | 同一用户多个请求时间重叠时提示 | 不强制阻止发布，只给提示 |
| 匹配分 | 根据标签、类别、共同空闲计算分数 | P0 可只按共同标签数量 |
| AI 建议 | 生成 2-3 条破冰建议 | 默认模板生成 |

### 5.3 P2 只做演示增强

P2 不依赖真实第三方服务。

| 模块 | 本阶段做法 | 明确不做 |
| --- | --- | --- |
| 地点/商户数据 | 使用本地 mock POI 数据 | 不接真实美团/点评 API |
| 远程 AI | 有 API Key 再接入 | 不让验收依赖远程 AI 成功 |
| 实时通知 | 页面刷新/轮询 | 不做 WebSocket，不做微信订阅消息 |
| 上线发布 | 保留后续路径说明 | 不做正式审核、域名、备案 |

## 6. 明确不做

以下内容全部后置，避免 5 天内范围失控：

- 真实 WHU-CAS 接入。
- 正式小程序上线。
- HTTPS 域名和小程序合法域名配置。
- 真实美团/大众点评 API。
- 复杂后台管理系统。
- WebSocket 实时聊天。
- 微信订阅消息。
- 用户协议、隐私政策、内容安全审核材料。
- 大规模性能优化。
- 完整内容审核、封禁、申诉流程。
- 真机演示作为唯一验收路径。

## 7. 技术栈决策

### 7.1 总体选择

| 层 | 技术 | 选择理由 |
| --- | --- | --- |
| 小程序前端 | 微信小程序原生 WXML/WXSS/JavaScript | 最少依赖，开发者工具直接支持，5 天内最稳 |
| 后端 | Node.js + TypeScript + Express | 启动快，接口开发快，和前端 JSON 协作简单 |
| 参数校验 | Zod | 快速保证接口输入可靠 |
| ORM | Prisma | schema 清晰，迁移和 seed 方便 |
| 数据库 | SQLite | 本地零配置，适合演示，可后续迁移 MySQL |
| 测试 | Vitest + Supertest | 覆盖后端核心接口 |
| 包管理 | npm | 当前机器已具备，不额外引入 pnpm/yarn |

### 7.2 为什么不选更重方案

- 不选 Taro/uni-app：跨端能力当前没有收益，会增加脚手架和构建复杂度。
- 不选 Spring Boot：稳定但启动和样板代码成本更高，不适合 5 天急交付。
- 不选 MySQL 作为默认库：本机虽然有 MySQL，但演示和重置数据用 SQLite 更稳。
- 不选 Redis/WebSocket：P0 用轮询和手动刷新足够演示。

## 8. 推荐目录结构

```text
luojialink/
  miniprogram/
    app.js
    app.json
    app.wxss
    pages/
      login/
      square/
      publish/
      post-detail/
      applications/
      calendar/
      chat/
      profile/
      report/
    components/
      post-card/
      tag-selector/
      time-slot-picker/
      ai-advice-card/
      empty-state/
    utils/
      request.js
      session.js
      format.js
    config/
      env.js

  server/
    package.json
    tsconfig.json
    prisma/
      schema.prisma
      seed.ts
      dev.db
    src/
      app.ts
      server.ts
      config/
      middleware/
      controllers/
      services/
      repositories/
      adapters/
      routes/
      utils/
    tests/

  docs/
    FOUNDATION_PLAN.md
    API.md
    DEMO_SCRIPT.md
    TEST_CASES.md
    TEST_REPORT.md
```

## 9. 后端模块边界

后端按 Controller-Service-Repository 分层：

| 模块 | 职责 |
| --- | --- |
| Auth | 模拟登录、token 签发、当前用户 |
| User | 用户资料、展示字段、标签 |
| Post | 发布请求、广场列表、详情、取消、过期判断 |
| Match | 想搭申请、匹配分、确认/拒绝、创建会话 |
| Calendar | 时间片、共同空闲、冲突检测 |
| Chat | 会话、消息、访问权限 |
| AI | 建议生成、隐私过滤、模板降级 |
| POI | 模拟地点数据查询 |
| Report | 举报创建和测试查看 |

外部依赖必须通过 adapter 封装：

- `CASAdapter`：本阶段只实现 mock。
- `LLMAdapter`：默认 template，可选 remote。
- `POIAdapter`：默认 mock。

## 10. 核心接口清单

接口统一前缀：`/api`

通用响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "traceId": "20260613-abcdef"
}
```

### 10.1 认证

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/auth/mock-login` | 模拟登录 |
| GET | `/auth/me` | 当前用户 |
| POST | `/auth/logout` | 退出 |

### 10.2 用户和标签

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/users/me/profile` | 获取资料 |
| PUT | `/users/me/profile` | 更新资料 |
| GET | `/tags` | 标签列表 |
| PUT | `/users/me/tags` | 更新我的标签 |

### 10.3 广场和发布

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/posts` | 广场列表 |
| POST | `/posts` | 发布请求 |
| GET | `/posts/:id` | 请求详情 |
| POST | `/posts/:id/cancel` | 取消请求 |

### 10.4 匹配申请

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/posts/:id/applications` | 提交想搭 |
| GET | `/posts/:id/applications` | 发起者查看申请 |
| GET | `/applications/me` | 我的申请 |
| POST | `/applications/:id/accept` | 接受申请 |
| POST | `/applications/:id/reject` | 拒绝申请 |

### 10.5 日历

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/calendar/slots` | 获取我的时间片 |
| PUT | `/calendar/slots` | 保存我的时间片 |
| GET | `/calendar/common-free` | 查看共同空闲 |
| GET | `/calendar/conflicts` | 查看冲突 |

### 10.6 会话和消息

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/sessions` | 我的会话 |
| GET | `/sessions/:id/messages` | 消息列表 |
| POST | `/sessions/:id/messages` | 发送消息 |
| POST | `/sessions/:id/close` | 关闭会话 |

### 10.7 AI、地点和举报

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/ai/recommendations` | 生成破冰建议 |
| GET | `/poi/search` | 查询模拟地点 |
| POST | `/reports` | 提交举报 |
| GET | `/admin/reports` | 查看举报记录，课程演示用 |
| GET | `/health` | 健康检查 |

## 11. 核心数据模型

### 11.1 User

保存校内身份模拟信息和展示资料。

关键字段：

- `id`
- `mockOpenId`
- `studentNo`
- `realName`
- `nickname`
- `college`
- `grade`
- `anonymousNo`
- `status`
- `createdAt`

隐私规则：

- 广场接口不能返回 `realName`、`studentNo`。
- AI 输入不能包含 `realName`、`studentNo`、联系方式。

### 11.2 Tag / UserTag

保存系统标签和用户标签。

标签类型建议：

- activity：约饭、运动、自习、观影、剧院
- interest：轻食、火锅、羽毛球、考研、自习
- style：安静、随和、效率型
- cost：AA、预算友好

### 11.3 Post

保存结伴请求。

关键字段：

- `id`
- `publisherId`
- `category`
- `startTime`
- `endTime`
- `locationPref`
- `feePref`
- `description`
- `anonymousFlag`
- `anonymousName`
- `expireTime`
- `status`
- `createdAt`

状态：

- `published`
- `matched`
- `expired`
- `cancelled`
- `reported`

约束：

- 同一用户最多 5 个有效请求。
- 过期请求不能被申请。

### 11.4 MatchApplication

保存“想搭”申请。

状态：

- `pending`
- `accepted`
- `rejected`
- `cancelled`
- `expired`

约束：

- 同一用户对同一 post 只能有一个有效申请。
- 不能申请自己的 post。
- 同一 post 最多一个 accepted 申请。

### 11.5 CalendarSlot

保存用户空闲时间片。

字段：

- `userId`
- `date`
- `startTime`
- `endTime`
- `status`

状态：

- `available`
- `busy`
- `conflict`
- `matched`

### 11.6 TempSession / Message

匹配成功后创建临时会话。

访问规则：

- 只有会话双方可读写。
- 关闭后只读或不可发送。

### 11.7 AIRecommendation

保存建议结果。

字段：

- `sessionId`
- `sourceType`：`template`、`mock`、`remote`
- `fallback`
- `contentJson`

### 11.8 Report

保存举报记录。

字段：

- `reporterId`
- `targetType`
- `targetId`
- `reason`
- `detail`
- `status`

## 12. 关键算法

### 12.1 匹配分

P0 版：

```text
score = 60 + 10 * commonTagCount
最高 95
```

P1 版：

```text
score =
  0.45 * tagOverlap +
  0.25 * categoryMatch +
  0.20 * commonFreeRatio +
  0.10 * locationPreferenceMatch
```

展示原则：

- 分数只辅助决策。
- 不做强制匹配。
- 申请者资料只展示有限字段。

### 12.2 共同空闲

输入：

- 用户 A 的 available 时间片
- 用户 B 的 available 时间片
- post 的期望时间范围

处理：

1. 按日期筛选双方时间片。
2. 合并连续时间片。
3. 求交集。
4. 再与 post 时间范围求交。

输出：

- 共同空闲时间段列表
- 如果为空，提示“暂无共同空闲，但仍可沟通确认”

### 12.3 请求过期

P0 做法：

- 查询广场时过滤过期请求。
- 申请时再次判断 `expireTime`。

P1 做法：

- 增加归档脚本或启动时扫描。

### 12.4 AI 建议降级

优先级：

1. `AI_MODE=remote` 且 API Key 存在：调用远程模型。
2. `AI_MODE=template`：根据类别、标签、地点生成模板建议。
3. 远程失败：自动 fallback 到 template。

建议内容格式：

```json
{
  "fallback": true,
  "recommendations": [
    {
      "title": "桂园附近简餐",
      "time": "18:40",
      "place": "桂园食堂附近",
      "reason": "距离近，预算友好，适合第一次见面",
      "icebreaker": "你更想吃清淡一点还是辣一点？"
    }
  ]
}
```

## 13. 小程序页面设计

### 13.1 底部 Tab

建议 4 个 Tab：

- 广场
- 日历
- 会话
- 我的

发布按钮放在广场页顶部或右下角。

### 13.2 页面清单

| 页面 | 核心内容 |
| --- | --- |
| 登录页 | 模拟登录入口、测试账号选择 |
| 广场页 | 筛选、请求卡片、发布入口 |
| 发布页 | 类别、时间、地点、费用、匿名、失效时间、描述 |
| 详情页 | 请求详情、匿名信息、标签、想搭按钮 |
| 申请列表页 | 待处理申请、匹配分、确认/拒绝 |
| 日历页 | 空闲时间、冲突、共同空闲 |
| 会话页 | 消息、AI 建议卡片、举报入口 |
| 我的页 | 资料、标签、我的发布、我的申请 |
| 举报页 | 举报原因、补充说明、提交 |

### 13.3 UI 原则

- 弱化头像和实名。
- 强调“想做什么、什么时候、在哪里、是否匹配”。
- 每个关键操作必须有明确反馈。
- 移动端操作层级不要深。
- 表单默认值要减少输入成本。

## 14. 演示数据

必须准备固定账号：

| 账号 | 姓名 | 学院 | 年级 | 标签 |
| --- | --- | --- | --- | --- |
| `alice` | 林知夏 | 计算机学院 | 2023 | 约饭、轻食、自习、预算友好 |
| `bob` | 周亦辰 | 信息管理学院 | 2022 | 约饭、羽毛球、火锅、随和 |
| `carol` | 陈一诺 | 外国语学院 | 2024 | 自习、观影、安静、剧院 |

必须准备固定请求：

- 今晚约饭，工学部附近，AA，预算 30-50。
- 明天下午羽毛球，卓尔体育馆附近。
- 周末自习，图书馆或信息学部。

必须准备固定地点：

- 桂园食堂
- 工学部一食堂
- 珞珈咖啡
- 卓尔体育馆
- 总图书馆
- 信息学部图书馆
- 街道口影院

## 15. 5 天排期

### 6 月 13 日：项目骨架和后端 P0

目标：

- 初始化 Git 仓库。
- 创建 `server` 和 `miniprogram` 目录。
- 完成 Prisma schema。
- 完成 seed 数据。
- 完成后端登录、用户、标签、发布、广场接口。

验收：

- `npm run dev` 能启动后端。
- `GET /api/health` 正常。
- 可以用接口完成模拟登录和发布请求。

### 6 月 14 日：小程序 P0 主链路

目标：

- 登录页。
- 广场页。
- 发布页。
- 详情页。
- 申请接口联调。

验收：

- A 可以发布。
- B 可以看到并申请。

### 6 月 15 日：匹配、会话、日历

目标：

- 申请列表页。
- 确认/拒绝。
- 会话创建。
- 消息发送。
- 日历时间片和共同空闲。

验收：

- A 确认 B 后，双方都能进入会话。
- 共同空闲可以展示。

### 6 月 16 日：AI 模板、举报、测试和打磨

目标：

- AI/模板建议卡片。
- 模拟地点。
- 举报。
- 错误提示。
- 后端接口测试。
- 演示数据重置脚本。

验收：

- 一键重置数据。
- 主流程无手动修数据库。

### 6 月 17 日：冻结、修 bug、准备验收

目标：

- 不再加大功能。
- 修演示路径 bug。
- 编写演示脚本。
- 编写测试记录。
- 准备备用截图或录屏。

验收：

- 10 分钟内稳定演示完整主流程。

## 16. 本地启动方案

### 16.1 后端

预计命令：

```bash
cd server
npm install
npm run db:push
npm run db:seed
npm run dev
```

默认地址：

```text
http://127.0.0.1:3000/api
```

健康检查：

```text
http://127.0.0.1:3000/api/health
```

### 16.2 小程序

1. 打开微信开发者工具。
2. 导入 `miniprogram` 目录。
3. 使用测试 AppID 或测试号。
4. 在开发者工具里开启：
   - 不校验合法域名。
   - 不校验 TLS 版本。
   - 不校验证书。
5. 确认小程序请求地址为：

```text
http://127.0.0.1:3000/api
```

真机调试如果必须使用，需要把接口地址改为电脑局域网 IP，并确认 Windows 防火墙放行 Node 端口。

## 17. 配置约定

后端 `.env` 建议：

```env
PORT=3000
DATABASE_URL="file:./dev.db"
AUTH_MODE=mock
AI_MODE=template
POI_MODE=mock
POST_MAX_ACTIVE=5
SESSION_EXPIRE_HOURS=72
LOG_LEVEL=debug
```

可选远程 AI：

```env
OPENAI_API_KEY=
GEMINI_API_KEY=
```

注意：验收默认不要依赖这些 Key。

## 18. 验收标准

### 18.1 功能验收

- 能登录两个以上测试账号。
- 能维护资料和标签。
- 能发布请求。
- 能在广场浏览和筛选请求。
- 能提交“想搭”申请。
- 发起者能确认申请。
- 确认后能创建会话。
- 会话能发送文字消息。
- 会话能展示 AI/模板建议。
- 日历能展示空闲、共同空闲或冲突。
- 能提交举报。

### 18.2 技术验收

- 本地启动步骤清晰。
- 数据能一键重置。
- 外部服务全部可 mock。
- 接口返回格式统一。
- 未登录不能访问业务接口。
- 非会话双方不能访问会话消息。
- 广场接口不返回实名和学号。

### 18.3 演示验收

- 演示全程不依赖真实 WHU-CAS。
- 演示全程不依赖真实美团/点评。
- AI 远程失败时不影响流程。
- 开发者工具模拟器能稳定运行。

## 19. 风险和应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 小程序本地请求失败 | 前后端无法联调 | 开发者工具开启不校验合法域名；必要时用局域网 IP |
| 远程 AI 不可用 | 建议卡片缺失 | 默认模板建议 |
| 真实 CAS 不可用 | 无法登录 | 固定 mock 账号 |
| 时间不够 | 功能半成品 | 保 P0，砍 P2 |
| 数据状态混乱 | 演示失败 | seed + reset 脚本 |
| 真机访问本机失败 | 演示不稳定 | 优先开发者工具模拟器 |

## 20. 当前环境检查结果

检查时间：2026-06-13  
检查目录：`D:\projects\luojialink`

### 20.1 已具备

| 环境 | 当前状态 |
| --- | --- |
| Git | 已安装，`git version 2.45.2.windows.1` |
| Node.js | 已安装，`v20.15.1` |
| npm | 已安装，`10.7.0` |
| Python | 已安装，`3.12.13` |
| MySQL | 已安装，`8.0.37` |
| SQLite CLI | 已安装，`3.51.2` |
| VS Code | 已安装，检测到 `code.cmd` |
| 微信开发者工具 | 已安装，`2.01.2510290`，路径：`D:\IDEtools\微信web开发者工具\微信开发者工具.exe` |
| npm registry | 可访问，`npm view express version` 成功 |

### 20.2 缺失或待确认

| 项 | 状态 | 是否阻塞 | 处理建议 |
| --- | --- | --- | --- |
| Git 仓库 | 当前目录不是 Git 仓库 | 阻塞协作和回滚 | 立即执行 `git init`，并提交文档基线 |
| pnpm | 未安装 | 不阻塞 | 本项目使用 npm |
| yarn | 未安装 | 不阻塞 | 本项目使用 npm |
| AI API Key | 未配置 | 不阻塞 | 默认 `AI_MODE=template` |
| `AUTH_MODE`/`AI_MODE`/`POI_MODE` 环境变量 | 未配置 | 不阻塞 | 后端 `.env` 中配置 |
| 微信开发者工具项目导入能力 | 已检测到主程序，但尚未实际导入本项目 | 待确认 | 后续创建 `miniprogram` 后，用微信开发者工具导入确认 |
| 小程序 AppID/测试号 | 未检测 | 可能阻塞小程序创建 | 准备测试号或可用 AppID；没有则用开发者工具测试号能力 |
| 3000 端口服务 | 当前未启动 | 不阻塞 | 后端启动后再检查 |

### 20.3 当前真正缺的东西

必须补：

1. 初始化 Git 仓库。
2. 准备小程序测试 AppID 或确认开发者工具可用测试号。
3. 创建后端 `.env`。
4. 后续创建 `miniprogram` 后，确认微信开发者工具能打开并导入项目。

可选补：

1. OpenAI/Gemini API Key。
2. pnpm 或 yarn。
3. DB Browser for SQLite。
4. 真机调试所需的局域网 IP 和防火墙放行。

## 21. 下一步执行顺序

1. `git init`
2. 创建 `server` 项目。
3. 创建 Prisma schema 和 seed。
4. 实现后端 P0 接口。
5. 创建 `miniprogram` 项目。
6. 实现登录、广场、发布、详情。
7. 联调申请、确认、会话。
8. 补日历、AI 模板、举报。
9. 写 `docs/DEMO_SCRIPT.md` 和 `docs/TEST_CASES.md`。
10. 6 月 17 日冻结功能，只修 bug。
