# AGENTS.md - NapCat 插件开发指南

## 构建命令

```bash
# 安装依赖
pnpm install

# 类型检查
pnpm run typecheck

# 生产构建（包含 WebUI）
pnpm run build

# 开发模式（热重载）
pnpm run dev

# 仅构建 WebUI
pnpm run build:webui

# WebUI 开发服务器
pnpm run dev:webui

# 部署到远程（与 build 相同）
pnpm run push
pnpm run deploy
```

## 项目结构

- **入口**: `src/index.ts` - 插件生命周期钩子
- **配置**: `src/config.ts` - 默认配置和 WebUI 配置 Schema
- **状态**: `src/core/state.ts` - 全局单例状态
- **处理器**: `src/handlers/` - 消息/事件处理器
- **服务**: `src/services/` - 业务逻辑
- **WebUI**: `src/webui/` - React + Vite 前端
- **类型**: `src/types.ts` - TypeScript 接口定义

## 代码风格

### 模块系统
- 仅使用 ESM（package.json 中设置 `"type": "module"`）
- 输出: `dist/index.mjs`

### 导入规范
```typescript
// 从 napcat-types 导入类型（使用深路径导入）
import type { NapCatPluginContext, PluginModule } from 'napcat-types/napcat-onebot/network/plugin/types';
import type { OB11Message, OB11PostSendMsg } from 'napcat-types/napcat-onebot';
import { EventType } from 'napcat-types/napcat-onebot/event/index';

// 内部模块导入
import { pluginState } from '../core/state';
```

### 格式化规范
- **缩进**: 4 个空格
- **引号**: 字符串使用单引号
- **分号**: 必需
- **换行符**: LF
- **最大行长度**: ~120 字符

### 类型与命名
- **接口**: PascalCase（如 `PluginConfig`, `UserData`）
- **类型**: PascalCase（如 `ApiResponse<T>`）
- **函数**: camelCase（如 `handleMessage`, `buildConfigSchema`）
- **常量**: UPPER_SNAKE_CASE 或 camelCase（如 `DEFAULT_CONFIG`）
- **类**: PascalCase（如 `PluginState`）
- **私有成员**: 使用下划线前缀（如 `_ctx`）

### 注释与文档
- 所有公共函数和接口使用 JSDoc
- 使用 `// ==================== 章节名称 ====================` 进行文件组织

## 核心模式

### 状态管理
```typescript
// 通过 pluginState 使用单例模式
import { pluginState } from '../core/state';

// 访问配置
const enabled = pluginState.config.enabled;

// 访问日志器
pluginState.logger.info('消息');

// 数据持久化
pluginState.loadDataFile<T>('filename.json', defaultValue);
pluginState.saveDataFile('filename.json', data);
```

### Action 调用
```typescript
// 始终使用 4 个参数，无参数时传入 {}
await ctx.actions.call(
    'send_msg',
    params,
    ctx.adapterName,
    ctx.pluginManager.config
);
```

### 路由注册
```typescript
// 需要鉴权的 API: /api/Plugin/ext/<plugin-id>/
ctx.router.get('/endpoint', handler);

// 无需鉴权的 API: /plugin/<plugin-id>/api/
ctx.router.getNoAuth('/endpoint', handler);

// 静态文件: /plugin/<plugin-id>/files/
ctx.router.static('/static', 'webui');

// 页面: /plugin/<plugin-id>/page/
ctx.router.page({ path: 'dashboard', title: '仪表盘', htmlFile: 'webui/index.html' });
```

## 架构设计原则

### 高内聚低耦合
- **单一职责**: 每个模块只负责一个明确的功能领域
- **分层架构**:
  - `handlers/` - 消息处理入口（解析命令、调用服务）
  - `services/` - 业务逻辑层（纯业务处理，不依赖消息格式）
  - `core/state.ts` - 状态管理层（配置、数据持久化）
- **最小依赖**: 模块间通过明确接口交互，避免循环依赖
- **易于定位**: 相关功能代码集中，便于快速修改和调试 Bug
- **可测试性**: 业务逻辑与框架解耦，便于单元测试

## 重要约束

### 禁止 Emoji 政策
- **前端图标**: 仅使用 SVG
- **转义**: 含反引号的颜文字必须转义或使用字符串拼接
  ```typescript
  // 正确: 字符串拼接
  ctx.logger.warn("(；′⌒`) 配置缺失");
  
  // 正确: 转义反引号
  ctx.logger.warn(`(；′⌒\`) 配置缺失`);
  
  // 错误: 模板字符串中未转义的反引号
  // ctx.logger.warn(`(；′⌒`) 配置缺失`); // 语法错误!
  ```

### WebUI 样式
- **主题色**: `#FB7299`（粉色）
- **禁用 CSS 渐变** - 仅使用纯色
- **卡片**: 使用 `.card` 类（白色背景、圆角、细边框）
- **激活状态**: `bg-primary text-white`
- **Tailwind**: 使用品牌色（`brand-50` 到 `brand-900`）

### 错误处理
```typescript
try {
    // 操作
} catch (error) {
    ctx.logger.error('操作失败:', error);
    // 根据需要返回或重新抛出
}
```

### 定时器管理
```typescript
// 始终在 pluginState.timers 中注册定时器
const timer = setInterval(() => { /* ... */ }, 60000);
pluginState.timers.set('jobId', timer);

// 在 plugin_cleanup 中通过 pluginState.cleanup() 自动清理
```

## 测试

本项目未配置测试框架。测试通过以下方式手动进行：
1. 运行 `pnpm run dev` 进行热重载开发
2. 使用 NapCat WebUI 测试插件功能
3. 在 NapCat 控制台检查日志

## 类型检查

提交前务必运行类型检查：
```bash
pnpm run typecheck
```

TypeScript 配置: `tsconfig.json`
- 目标: ESNext
- 严格模式: 启用
- 模块解析: bundler
