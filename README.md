# NapCat 签到插件

一个功能丰富的 QQ 机器人签到插件，支持每日签到、积分系统、连续签到加成、Canvas 精美卡片、排行榜等特性。

## 功能特性

### 签到功能
- **每日签到** - 发送 `签到` 即可签到，获得随机积分 10-50
- **连续签到加成** - 连续签到每天额外 +2 积分，上限 +20
- **Canvas 卡片** - 精美的签到结果展示卡片
- **签到冷却** - 每个群独立冷却时间（默认 5 秒）

### 积分系统
- **积分查询** - `#cmd我的积分` 查看个人数据
- **全服排行** - `#cmd积分排行` 查看全服 TOP10
- **群内排行** - `#cmd积分排行` 查看群内 TOP10
- **签到天数** - 累计签到天数统计

### 群管理
- **开关签到** - 群主/管理员可 `#cmd开启签到` / `#cmd关闭签到`
- **群隔离** - 各群签到数据独立统计
- **状态持久化** - 群设置自动保存

### WebUI 管理
- **仪表盘** - 插件状态概览
- **插件配置** - 可视化配置
- **群管理** - 群的启用/禁用管理
- **签到数据** - 全服/分群排行榜

## 安装

### 方式一：NapCat 插件市场

在 NapCat WebUI 的插件管理页面搜索"签到插件"并安装。

### 方式二：手动安装

1. 从 [GitHub Releases](https://github.com/MY-Final/napcat-plugin-checkin/releases) 下载最新版本
2. 解压到 NapCat 的 `plugins` 目录
3. 重启 NapCat 或热重载插件

## 使用方法

### 基础指令

| 指令 | 说明 |
|------|------|
| `签到` | 每日签到，获得随机积分 |
| `#cmd我的积分` | 查询个人签到数据 |
| `#cmd积分排行` | 查看排行榜 |
| `#cmdhelp` | 显示帮助信息 |

### 管理指令

| 指令 | 说明 | 权限 |
|------|------|------|
| `#cmd开启签到` | 开启群内签到功能 | 群主/管理员 |
| `#cmd关闭签到` | 关闭群内签到功能 | 群主/管理员 |

### 排行榜说明

- **全服排行** - 展示所有群用户的积分 TOP50
- **群内排行** - 展示当前群用户的积分 TOP50
- **签到加成** - 连续签到 3 天以上显示橙色标记，7 天以上显示红色标记

## WebUI 页面

访问 NapCat WebUI 的插件页面，可使用以下功能：

1. **仪表盘** - 查看插件运行状态、统计数据
2. **插件配置** - 配置默认参数
3. **群管理** - 查看和管理各群的签到状态
4. **签到数据** - 查看全服/分群排行榜

## 配置项

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| 默认签到冷却 | 群聊签到冷却时间（秒） | 5 |
| 最小签到积分 | 单次签到最少获得积分 | 10 |
| 最大签到积分 | 单次签到最多获得积分 | 50 |
| 连续签到加成 | 每天额外增加的积分 | 2 |
| 最大加成上限 | 连续签到加成的上限 | 20 |

## 项目结构

```
napcat-plugin-checkin/
├── src/
│   ├── index.ts              # 插件入口，生命周期函数
│   ├── config.ts             # 配置定义和 WebUI Schema
│   ├── types.ts              # TypeScript 类型定义
│   ├── core/
│   │   └── state.ts          # 全局状态管理单例
│   ├── handlers/
│   │   └── message-handler.ts # 消息处理器
│   ├── services/
│   │   ├── api-service.ts    # WebUI API 路由
│   │   └── checkin-service.ts # 签到核心业务逻辑
│   ├── utils/
│   │   └── canvas-card.ts    # Canvas 签到卡片生成
│   └── webui/                # React SPA 前端
│       ├── src/
│       │   ├── pages/
│       │   │   ├── StatusPage.tsx   # 仪表盘
│       │   │   ├── ConfigPage.tsx  # 配置页面
│       │   │   ├── GroupsPage.tsx  # 群管理
│       │   │   └── CheckinDataPage.tsx # 签到数据
│       │   └── ...
├── package.json
├── vite.config.ts
└── README.md
```

## 开发

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

## 技术栈

- **框架**: Vue 3 + TypeScript + Vite
- **UI 组件**: Element Plus
- **状态管理**: Pinia
- **WebUI**: React + TailwindCSS
- **构建**: Vite

## 作者

**MY-Final**

- GitHub: [@MY-Final](https://github.com/MY-Final)
- 仓库: [napcat-plugin-checkin](https://github.com/MY-Final/napcat-plugin-checkin)

## 许可证

MIT License

## 感谢

- [NapCat](https://github.com/NapNeko/NapCat) - QQ 机器人框架
- [Element Plus](https://element-plus.org/) - Vue 3 UI 组件库
