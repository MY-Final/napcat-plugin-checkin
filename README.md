# NapCat 签到插件

[![Version](https://img.shields.io/github/v/release/MY-Final/napcat-plugin-checkin)](https://github.com/MY-Final/napcat-plugin-checkin/releases)
[![License](https://img.shields.io/github/license/MY-Final/napcat-plugin-checkin)](LICENSE)

一个功能丰富的 QQ 机器人签到插件，支持每日签到、积分系统、连续签到加成、Canvas 精美卡片、排行榜、活跃统计、积分兑换 API 等特性。

## ✨ 功能特性

### 📝 签到功能
- **每日签到** - 发送 `签到` 即可签到，获得随机积分 10-50
- **连续签到加成** - 连续签到每天额外 +2 积分，上限 +20
- **周末加成** - 支持周末额外积分加成
- **Canvas 卡片** - 精美的签到结果展示卡片（需安装 puppeteer 插件）
- **自定义模板** - 支持 HTML 模板自定义签到卡片样式
- **签到冷却** - 每个群独立冷却时间（默认 60 秒）

### 💎 积分系统
- **积分查询** - `#cmd 我的积分` 查看个人数据
- **全服积分排行** - `#cmd 总排行` 查看全服积分 TOP100
- **全服活跃排行** - `#cmd 活跃排行` 查看使用天数排行（识别忠实用户）
- **群内排行** - `#cmd 积分排行` 查看群内 TOP10
- **签到天数** - 累计签到天数和活跃天数统计

### 🔧 群管理
- **开关签到** - 群主/管理员可 `#cmd 开启签到` / `#cmd 关闭签到`
- **群隔离** - 各群签到数据独立统计
- **状态持久化** - 群设置自动保存

### 🎨 WebUI 管理面板
- **仪表盘** - 插件状态概览和统计数据
- **使用说明** - 详细的使用指南和扩展开发文档
- **插件配置** - 可视化配置所有参数
- **群管理** - 查看群头像、管理各群的签到状态
- **积分排行** - 全服积分排行榜，点击头像查看用户详情
- **活跃排行** - 全服活跃排行榜，识别忠实用户
- **分群排行** - 各群签到排行，卡片式群选择器
- **模板编辑** - 可视化编辑签到卡片 HTML 模板，实时预览
- **接口文档** - 完整的 API 接口文档

### 🔌 积分管理 API
提供完整的 RESTful API 供其他插件集成：
- **查询积分** - 获取用户在群内的当前积分
- **修改积分** - 增加/减少积分（用于兑换奖励）
- **积分历史** - 查看积分变更记录
- **重置积分** - 将积分清零（谨慎使用）

### 🛡️ 数据保护
- **自动备份** - 每次保存数据前自动创建备份
- **自动恢复** - 插件启动时自动检查并修复损坏的数据
- **更新保护** - 更新插件时不会丢失历史数据

## 📦 安装

### 方式一：NapCat 插件市场

在 NapCat WebUI 的插件管理页面搜索"签到插件"并安装。

### 方式二：手动安装

1. 从 [GitHub Releases](https://github.com/MY-Final/napcat-plugin-checkin/releases) 下载最新版本
2. 解压到 NapCat 的 `plugins` 目录
3. 重启 NapCat 或热重载插件

### 依赖说明

如需使用**图片打卡功能**，需要安装 [napcat-plugin-puppeteer](https://github.com/AQiaoYo/napcat-plugin-puppeteer) 插件。
本插件的模板编辑功能仿照 Puppeteer 渲染服务设计。

## 🚀 使用方法

### 基础指令

| 指令 | 说明 |
|------|------|
| `签到` | 每日签到，获得随机积分 |
| `#cmd 我的积分` | 查询个人签到数据 |
| `#cmd 总排行` | 查看全服积分排行榜 |
| `#cmd 活跃排行` | 查看全服活跃排行榜（按使用天数） |
| `#cmd 积分排行` | 查看群内排行榜 |
| `#cmd help` | 显示帮助信息 |

### 管理指令

| 指令 | 说明 | 权限 |
|------|------|------|
| `#cmd 开启签到` | 开启群内签到功能 | 群主/管理员 |
| `#cmd 关闭签到` | 关闭群内签到功能 | 群主/管理员 |

### 排行榜说明

- **全服积分排行** - 展示所有群用户的积分 TOP100
- **全服活跃排行** - 展示使用天数最多的忠实用户 TOP100
- **群内排行** - 展示当前群用户的积分排名
- **签到加成** - 连续签到 3 天以上显示橙色标记，7 天以上显示红色标记

## 🎨 WebUI 功能详解

### 仪表盘
查看插件运行状态、今日处理消息数、累计处理消息数等统计信息。

### 使用说明
- 插件功能介绍
- 快速开始指南
- 命令列表
- 扩展开发指南（积分兑换系统集成）
- 注意事项

### 群管理
- 显示群头像（从 QQ 服务器获取）
- 查看群名称、群号、成员数
- 群功能总开关
- 签到功能独立开关
- 批量启用/禁用

### 积分排行
- 显示全服积分排行榜 TOP100
- **点击用户头像**可查看详细信息：
  - 累计积分、签到天数、活跃天数
  - 连续签到天数
  - 最近签到记录（日期、时间、获得积分、当日排名）

### 活跃排行
- 按使用天数排序（每天首次使用机器人计1天）
- 识别最忠实的用户
- 同样支持点击头像查看详情

### 分群排行
- 卡片式群选择器，直观显示群信息
- 查看各群的签到排行
- 显示群内积分、签到次数、最后签到时间

### 模板编辑
- 可视化 HTML 编辑器
- 实时预览模板效果
- 丰富的模板变量：
  - `{{nickname}}` - 用户昵称
  - `{{userId}}` - 用户QQ号
  - `{{avatarUrl}}` - 用户头像URL
  - `{{earnedPoints}}` - 本次获得积分
  - `{{totalPoints}}` - 累计积分
  - `{{totalDays}}` - 累计签到天数
  - `{{consecutiveDays}}` - 连续签到天数
  - `{{todayRank}}` - 今日排名
  - `{{weekdayName}}` - 星期几（中文）
  - `{{isWeekend}}` - 是否周末
  - `{{groupName}}` - 群名称
  - `{{activeDays}}` - 活跃天数
  - `{{basePoints}}` - 基础积分
  - `{{consecutiveBonus}}` - 连续签到加成
  - `{{weekendBonus}}` - 周末加成
  - `{{quote}}` - 随机寄语

### 接口文档
完整的 API 文档，包含：
- 签到相关接口
- 排行相关接口
- 积分管理接口（CRUD）
- 模板预览接口

## ⚙️ 配置项

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| 命令前缀 | 触发命令的前缀 | `#cmd` |
| 冷却时间 | 群聊签到冷却时间（秒） | 60 |
| 最小签到积分 | 单次签到最少获得积分 | 10 |
| 最大签到积分 | 单次签到最多获得积分 | 50 |
| 连续签到加成 | 每天额外增加的积分 | 2 |
| 最大加成上限 | 连续签到加成的上限 | 20 |
| 周末加成 | 周末额外积分 | 5 |
| 签到命令 | 触发签到的命令列表 | 签到,打卡,sign,checkin |

## 🔌 API 接口

### 积分管理接口示例

```typescript
// 查询用户积分
const res = await fetch('/plugin/napcat-plugin-checkin/api/checkin/groups/123456/users/1150880493/points');
const data = await res.json();

// 扣除积分（兑换奖励）
const result = await fetch('/plugin/napcat-plugin-checkin/api/checkin/groups/123456/users/1150880493/points', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    points: -100,  // 扣除100积分
    description: '兑换奖励-精美头像框',
    type: 'exchange'
  })
});
```

## 📁 项目结构

```
napcat-plugin-checkin/
├── src/
│   ├── index.ts              # 插件入口，生命周期函数
│   ├── config.ts             # 配置定义和 WebUI Schema
│   ├── types.ts              # TypeScript 类型定义
│   ├── CHANGELOG.md          # 更新日志
│   ├── core/
│   │   └── state.ts          # 全局状态管理（含数据保护）
│   ├── handlers/
│   │   ├── message-handler.ts    # 消息处理器
│   │   └── checkin-handler.ts    # 签到处理器
│   ├── services/
│   │   ├── api-service.ts        # WebUI API 路由
│   │   ├── checkin-service.ts    # 签到核心业务逻辑
│   │   └── points-calculator.ts  # 积分计算
│   ├── utils/
│   │   └── checkin-messages.ts   # 随机寄语
│   └── webui/                # React SPA 前端
│       ├── src/
│       │   ├── components/
│       │   │   └── UserDetailModal.tsx  # 用户详情弹窗
│       │   ├── pages/
│       │   │   ├── StatusPage.tsx       # 仪表盘
│       │   │   ├── HelpPage.tsx         # 使用说明
│       │   │   ├── ConfigPage.tsx       # 配置页面
│       │   │   ├── GroupsPage.tsx       # 群管理
│       │   │   ├── PointsRankingPage.tsx    # 积分排行
│       │   │   ├── ActiveRankingPage.tsx    # 活跃排行
│       │   │   ├── CheckinDataPage.tsx      # 分群排行
│       │   │   ├── TemplatePage.tsx         # 模板编辑
│       │   │   └── ApiDocsPage.tsx          # 接口文档
│       │   └── ...
├── package.json
├── vite.config.ts
└── README.md
```

## 💻 开发

### 环境要求

- Node.js 18+
- pnpm 8+
- NapCat 4.14.0+

### 快速开始

```bash
# 安装依赖
pnpm install

# 开发模式（热重载）
pnpm run dev

# 构建
pnpm run build

# 部署到 NapCat
pnpm run deploy
```

### 命令说明

| 命令 | 说明 |
|------|------|
| `pnpm run dev` | 开发模式，监听文件变化自动构建并热重载 |
| `pnpm run build` | 构建生产版本 |
| `pnpm run deploy` | 构建并自动部署到 NapCat |
| `pnpm run build:webui` | 仅构建 WebUI 前端 |
| `pnpm run dev:webui` | WebUI 开发服务器（实时预览） |

## 🛠️ 技术栈

- **后端框架**: TypeScript + Vite
- **WebUI 框架**: React 18 + TypeScript
- **UI 样式**: TailwindCSS
- **构建工具**: Vite
- **插件框架**: NapCat

## 📱 界面预览

### WebUI 管理面板
- 仪表盘：插件状态概览
- 群管理：群头像显示、开关控制
- 积分排行：点击头像查看用户详情
- 活跃排行：识别忠实用户
- 分群排行：卡片式群选择器
- 模板编辑：可视化编辑 + 实时预览

## 🤝 反馈与支持

- **QQ群**: [1072957415](http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=myZ-6WbZkavmF1KWGNdTQ8SpbVAi_hjY&authKey=qytWUv7F5XBh18%2FbyLreigwR3QzfSh9nKPu3anwOdcoOqPyzZOavROvPNGdLmq8V&noverify=0&group_code=1072957415)
- **GitHub**: [@MY-Final](https://github.com/MY-Final)
- **Issues**: [提交问题](https://github.com/MY-Final/napcat-plugin-checkin/issues)

## 📝 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 获取详细的版本更新历史。

## 📄 许可证

MIT License

## 🙏 感谢

- [NapCat](https://github.com/NapNeko/NapCat) - QQ 机器人框架
- [TailwindCSS](https://tailwindcss.com/) - CSS 框架
- [React](https://react.dev/) - 前端框架