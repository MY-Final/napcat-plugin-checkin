# NapCat 插件开发 API 参考文档

## NapCatPluginContext

插件的核心上下文对象，包含了几乎所有你需要的功能。在所有生命周期函数中作为第一个参数传入。

### 属性一览

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `core` | `NapCatCore` | NapCat 底层核心实例 |
| `oneBot` | `NapCatOneBot11Adapter` | OneBot11 协议适配器 |
| `actions` | `ActionMap` | OneBot11 Action 调用器 |
| `pluginName` | `string` | 当前插件名称 |
| `pluginPath` | `string` | 插件所在目录 |
| `configPath` | `string` | 插件配置文件路径 |
| `dataPath` | `string` | 插件数据存储目录 |
| `NapCatConfig` | `NapCatConfigClass` | 配置构建工具类 |
| `adapterName` | `string` | 适配器名称 |
| `pluginManager` | `IPluginManager` | 插件管理器 |
| `logger` | `PluginLogger` | 日志记录器 |
| `router` | `PluginRouterRegistry` | 路由注册器 |
| `getPluginExports` | `<T>(pluginId: string) => T \| undefined` | 获取其他插件的导出 |

### `ctx.actions`

OneBot11 Action 调用器。

**调用签名**:

```typescript
ctx.actions.call(actionName, params, ctx.adapterName, ctx.pluginManager.config)
```

- `actionName`: Action 名称（字符串）
- `params`: 请求参数（不同 action 参数不同，无参数时传 `{}`）
- `adapter`: 适配器名称，使用 `ctx.adapterName`
- `config`: 网络配置，使用 `ctx.pluginManager.config`

**常用 Action 示例**:

```typescript
// 通用发送消息 (推荐用法)
const params: OB11PostSendMsg = {
    message: 'Hello',
    message_type: 'group',
    group_id: '123456',
};
await ctx.actions.call('send_msg', params, ctx.adapterName, ctx.pluginManager.config);

// 获取登录信息
const info = await ctx.actions.call('get_login_info', {}, ctx.adapterName, ctx.pluginManager.config);

// 获取群列表
const groups = await ctx.actions.call('get_group_list', {}, ctx.adapterName, ctx.pluginManager.config);

// 获取版本信息
const version = await ctx.actions.call('get_version_info', {}, ctx.adapterName, ctx.pluginManager.config);

// 撤回消息
await ctx.actions.call('delete_msg', { message_id }, ctx.adapterName, ctx.pluginManager.config);
```

### `ctx.logger`

带有插件名称前缀的日志记录器，实现 `PluginLogger` 接口。

| 方法 | 说明 |
| --- | --- |
| `log(...)` | 输出普通日志 |
| `debug(...)` | 输出调试日志（仅 debug 模式可见） |
| `info(...)` | 输出信息日志 |
| `warn(...)` | 输出警告日志 |
| `error(...)` | 输出错误日志 |

### `ctx.pluginManager`

插件管理器接口 (`IPluginManager`)，提供对其他插件的管理能力。

| 方法 | 返回值 | 说明 |
| --- | --- | --- |
| `getPluginPath()` | `string` | 获取插件根目录 |
| `getPluginConfig()` | `PluginStatusConfig` | 获取插件启用状态配置 |
| `getAllPlugins()` | `PluginEntry[]` | 获取所有已扫描的插件列表 |
| `getLoadedPlugins()` | `PluginEntry[]` | 获取所有已加载的插件列表 |
| `getPluginInfo(pluginId)` | `PluginEntry \| undefined` | 获取指定插件信息 |
| `setPluginStatus(pluginId, enable)` | `Promise<void>` | 启用/禁用插件 |
| `loadPluginById(pluginId)` | `Promise<boolean>` | 加载指定插件 |
| `unregisterPlugin(pluginId)` | `Promise<void>` | 注销插件 |
| `uninstallPlugin(pluginId, cleanData?)` | `Promise<void>` | 卸载并删除插件 |
| `reloadPlugin(pluginId)` | `Promise<boolean>` | 重新加载插件 |
| `loadDirectoryPlugin(dirname)` | `Promise<void>` | 从目录加载插件 |
| `getPluginDataPath(pluginId)` | `string` | 获取插件数据目录 |
| `getPluginConfigPath(pluginId)` | `string` | 获取插件配置目录 |

### `ctx.router`

WebUI 和 API 路由注册器 (`PluginRouterRegistry`)。

#### 需要鉴权的路由

路径前缀：`/api/Plugin/ext/<plugin-id>/`

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `api` | `(method, path, handler)` | 注册指定 HTTP 方法的 API |
| `get` | `(path, handler)` | 注册 GET API |
| `post` | `(path, handler)` | 注册 POST API |
| `put` | `(path, handler)` | 注册 PUT API |
| `delete` | `(path, handler)` | 注册 DELETE API |

#### 无需鉴权的路由

路径前缀：`/plugin/<plugin-id>/api/`

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `apiNoAuth` | `(method, path, handler)` | 注册指定 HTTP 方法的开放 API |
| `getNoAuth` | `(path, handler)` | 注册 GET 开放 API |
| `postNoAuth` | `(path, handler)` | 注册 POST 开放 API |
| `putNoAuth` | `(path, handler)` | 注册 PUT 开放 API |
| `deleteNoAuth` | `(path, handler)` | 注册 DELETE 开放 API |

#### 页面与静态文件

| 方法 | 签名 | 路径前缀 | 说明 |
| --- | --- | --- | --- |
| `page` | `(pageDefinition)` | `/plugin/<plugin-id>/page/<path>` | 注册页面 |
| `pages` | `(pageDefinitions)` | 同上 | 批量注册页面 |
| `static` | `(urlPath, localPath)` | `/plugin/<plugin-id>/files/<urlPath>/` | 注册本地静态文件服务 |
| `staticOnMem` | `(urlPath, files)` | `/plugin/<plugin-id>/mem/<urlPath>/` | 注册内存静态文件服务 |

### `ctx.NapCatConfig`

配置构建工具类，提供便捷的静态方法生成 `PluginConfigItem`：

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `text` | `(key, label, defaultValue?, description?, reactive?)` | 文本输入 |
| `number` | `(key, label, defaultValue?, description?, reactive?)` | 数字输入 |
| `boolean` | `(key, label, defaultValue?, description?, reactive?)` | 布尔开关 |
| `select` | `(key, label, options, defaultValue?, description?, reactive?)` | 下拉单选 |
| `multiSelect` | `(key, label, options, defaultValue?, description?, reactive?)` | 下拉多选 |
| `html` | `(content)` | HTML 展示 |
| `plainText` | `(content)` | 纯文本展示 |
| `combine` | `(...items)` | 合并多个配置项为 Schema |

### `ctx.getPluginExports`

```typescript
getPluginExports<T = PluginModule>(pluginId: string): T | undefined
```

获取其他已加载插件的导出模块对象。支持泛型参数以获得类型提示。

---

## 签到插件 API 接口

以下 API 均位于路径前缀 `/plugin/napcat-plugin-checkin/api/` 下（无鉴权）或 `/api/Plugin/ext/napcat-plugin-checkin/` 下（需鉴权）。

### 通用说明

- **响应格式**: 所有 API 返回统一 JSON 格式 `{ code: number, message?: string, data?: any }`
- **code**: 0 表示成功，-1 表示失败
- **路径参数**: 使用冒号表示，如 `:id` 表示动态参数

---

### 1. 状态与配置

#### 获取插件状态

```
GET /status
```

响应示例:
```json
{
    "code": 0,
    "data": {
        "pluginName": "napcat-plugin-checkin",
        "uptime": 3600000,
        "uptimeFormatted": "1小时0分钟",
        "config": { ... },
        "stats": { ... }
    }
}
```

#### 获取插件配置

```
GET /config
```

#### 保存插件配置（需鉴权）

```
POST /config
```

请求体: `Partial<PluginConfig>`

---

### 2. 群管理

#### 获取群列表

```
GET /groups
```

响应示例:
```json
{
    "code": 0,
    "data": [
        {
            "group_id": 123456,
            "group_name": "测试群",
            "member_count": 100,
            "max_member_count": 200,
            "enabled": true,
            "enable_checkin": true
        }
    ]
}
```

#### 更新群配置

```
POST /groups/:id/config
```

请求体:
```json
{
    "enabled": true,
    "enableCheckin": true
}
```

#### 批量更新群配置

```
POST /groups/bulk-config
```

请求体:
```json
{
    "enabled": true,
    "groupIds": ["123456", "789012"]
}
```

---

### 3. 用户数据

#### 获取用户签到数据

```
GET /checkin/user/:id?groupId=xxx
```

- `id`: 用户 QQ 号
- `groupId` (可选): 指定群 ID，不填返回全局数据

响应示例:
```json
{
    "code": 0,
    "data": {
        "userId": "123456",
        "nickname": "用户名",
        "totalExp": 1000,
        "balance": 500,
        "totalCheckinDays": 30,
        "consecutiveDays": 5,
        "lastCheckinDate": "2024-01-15"
    }
}
```

#### 获取用户分群余额详情

```
GET /checkin/user/:userId/balance
```

#### 获取所有用户列表

```
GET /checkin/users
```

---

### 4. 统计数据

#### 获取今日签到统计

```
GET /checkin/today-stats
```

#### 获取活跃排行榜

```
GET /checkin/active-ranking
```

#### 获取所有签到统计数据

```
GET /checkin/stats
```

---

### 5. 排行榜

#### 获取全服排行榜

```
GET /checkin/ranking
```

#### 清理旧数据

```
POST /checkin/cleanup
```

请求体:
```json
{
    "daysToKeep": 90
}
```

---

### 6. 群签到统计

#### 获取所有群的签到统计

```
GET /checkin/groups
```

#### 获取指定群签到统计

```
GET /checkin/groups/:id
```

#### 获取指定群积分排行

```
GET /checkin/groups/:id/ranking
```

#### 获取指定群签到排行

```
GET /checkin/groups/:id/checkin-ranking
```

---

### 7. 积分管理

#### 获取群用户积分

```
GET /checkin/groups/:groupId/users/:userId/points
```

#### 修改群用户积分（需鉴权）

```
POST /checkin/groups/:groupId/users/:userId/points
```

请求体:
```json
{
    "points": 100,
    "description": "管理员奖励",
    "type": "admin",
    "operatorId": "admin123"
}
```

#### 获取积分变更历史

```
GET /checkin/groups/:groupId/users/:userId/points/history?limit=50
```

#### 重置积分（需鉴权）

```
POST /checkin/groups/:groupId/users/:userId/points/reset
```

请求体:
```json
{
    "description": "积分重置",
    "operatorId": "admin123"
}
```

---

### 8. 排行榜数据

#### 获取排行榜数据

```
GET /leaderboard/:groupId?type=week
```

- `type`: 排行榜类型（week/month/year/all）

---

### 9. 模板管理

#### 获取所有模板

```
GET /templates
```

#### 获取指定模板

```
GET /templates/:id
```

#### 按类型获取模板

```
GET /templates/type/:type
```

- `type`: `checkin` 或 `leaderboard`

#### 创建模板（无需鉴权）

```
POST /templates
```

请求体:
```json
{
    "name": "我的模板",
    "type": "checkin",
    "html": "<div>...</div>"
}
```

#### 更新模板（无需鉴权）

```
PUT /templates/:id
```

请求体:
```json
{
    "name": "新名称",
    "html": "<div>...</div>",
    "enabled": true
}
```

#### 删除模板（无需鉴权）

```
DELETE /templates/:id
```

#### 复制模板（无需鉴权）

```
POST /templates/:id/duplicate
```

请求体:
```json
{
    "name": "复制模板"
}
```

#### 设置默认模板（无需鉴权）

```
POST /templates/:id/set-default
```

#### 获取模板配置

```
GET /templates/config
```

#### 更新模板配置（无需鉴权）

```
POST /templates/config
```

请求体:
```json
{
    "randomMode": "random",
    "checkinTemplateId": "xxx",
    "leaderboardTemplateId": "xxx"
}
```

#### 初始化默认模板（无需鉴权）

```
POST /templates/init-defaults
```

---

### 10. 模板预览

#### 预览 HTML 模板（无需鉴权）

```
POST /template/preview
```

请求体:
```json
{
    "template": "<div>{{nickname}}</div>",
    "data": {
        "nickname": "测试用户"
    },
    "type": "checkin"
}
```

---

### 11. 签到日志

#### 分页查询日志

```
GET /logs?page=1&pageSize=50&userId=xxx&groupId=xxx&startDate=2024-01-01&endDate=2024-01-31&status=success&order=desc
```

#### 获取日志统计

```
GET /logs/stats?timeRange=month
```

- `timeRange`: today/week/month/year/all

#### 获取每日签到趋势

```
GET /logs/trend?days=30
```

#### 获取单条日志

```
GET /logs/:id
```

#### 获取用户日志

```
GET /logs/users/:userId?page=1&pageSize=50&groupId=xxx
```

#### 获取用户日志数量

```
GET /logs/users/:userId/count
```

#### 获取群日志

```
GET /logs/groups/:groupId?page=1&pageSize=50&userId=xxx
```

#### 获取群日志数量

```
GET /logs/groups/:groupId/count
```

#### 获取日志配置

```
GET /logs/config
```

#### 获取群日志配置

```
GET /logs/config/:groupId
```

#### 更新群日志配置（无需鉴权）

```
POST /logs/config/:groupId
```

请求体:
```json
{
    "enabled": true,
    "enableStats": true,
    "retentionDays": 90
}
```

#### 清理过期日志（无需鉴权）

```
POST /logs/cleanup?days=90
```

---

### 12. v1 API（双轨制积分系统）

路径前缀：`/plugin/napcat-plugin-checkin/api/v1/`

#### 奖励积分（需鉴权）

```
POST /v1/groups/:groupId/users/:userId/award
```

请求体:
```json
{
    "amount": 100,
    "description": "活动奖励",
    "source": "activity",
    "applyLevelBonus": true,
    "multiplier": 1.5,
    "relatedPlugin": "other-plugin"
}
```

#### 消费积分（需鉴权）

```
POST /v1/groups/:groupId/users/:userId/consume
```

请求体:
```json
{
    "amount": 50,
    "description": "兑换奖励",
    "orderId": "order-123",
    "idempotencyKey": "unique-key-123",
    "relatedPlugin": "other-plugin"
}
```

#### 检查余额

```
GET /v1/groups/:groupId/users/:userId/balance/check?required=100
```

#### 获取用户积分信息

```
GET /v1/groups/:groupId/users/:userId/points
```

#### 获取交易流水

```
GET /v1/groups/:groupId/users/:userId/transactions?limit=50
```

#### 获取等级配置

```
GET /v1/levels/config
```

#### 获取用户等级信息

```
GET /v1/groups/:groupId/users/:userId/level
```

#### 获取群称号

```
GET /v1/groups/:groupId/titles
```

#### 获取用户称号

```
GET /v1/groups/:groupId/users/:userId/titles
```

#### 佩戴称号（需鉴权）

```
POST /v1/groups/:groupId/users/:userId/titles/equip
```

请求体:
```json
{
    "titleId": "title-123"
}
```

#### 经验值排行

```
GET /v1/groups/:groupId/ranking/exp?limit=50
```

#### 余额排行

```
GET /v1/groups/:groupId/ranking/balance?limit=50
```

---

## OB11Message 消息对象

当收到 `plugin_onmessage` 事件时，传递的消息对象。

### 属性

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `message_id` | `number` | 消息 ID |
| `user_id` | `number` | 发送者 QQ |
| `group_id` | `number` | 群号（私聊时为 0） |
| `message_type` | `'private' \| 'group'` | 消息类型 |
| `raw_message` | `string` | 原始消息文本 |
| `message` | `MessageSegment[]` | 消息段数组 |
| `sender` | `OB11Sender` | 发送者信息 |
| `time` | `number` | 时间戳 |

---

更多详细类型定义请参考 TypeScript 提示或查阅 `napcat-types` 包。
