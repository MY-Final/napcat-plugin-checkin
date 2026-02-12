# 双轨制积分系统 API 文档

## 变更说明

### v1.1.0 更新内容

1. **群内独立签到**
   - 每个群可以独立签到，不再限制每天只能签到一次
   - 在 A 群签到后，仍然可以在 B 群签到
   - 每群仍然遵循周期配置（每天/每周/每月可签到次数）

2. **双轨制积分**
   - `totalExp`: 累计经验值（只增不减，用于排名和等级）
   - `balance`: 可用余额（可增可减，用于消费）

3. **新增 v1 API 接口**

---

## 认证与授权

### 接口分类

本 API 接口分为两类：

| 类型 | 说明 | 示例 |
|------|------|------|
| **无需鉴权** | 公开接口，可直接调用 | 查询用户积分、排行榜、等级配置 |
| **需要鉴权** | 敏感操作接口，需 NapCat 框架认证 | 修改积分、配置管理、佩戴称号 |

### 认证方式

需要鉴权的接口使用 NapCat 框架内置的认证机制：

- **WebUI 调用**：通过 NapCat WebUI 登录后自动携带认证信息
- **API 调用**：需在请求头中携带认证 token

```
Authorization: Bearer <token>
```

### 需要鉴权的接口

以下接口**必须**通过认证才能访问：

#### 配置管理
- `POST /config` - 保存插件配置
- `POST /groups/:id/config` - 更新单个群配置
- `POST /groups/bulk-config` - 批量更新群配置

#### 积分操作
- `POST /checkin/groups/:groupId/users/:userId/points` - 修改用户积分
- `POST /checkin/groups/:groupId/users/:userId/points/reset` - 重置用户积分
- `POST /v1/groups/:groupId/users/:userId/award` - 奖励积分
- `POST /v1/groups/:groupId/users/:userId/consume` - 消费积分
- `POST /v1/groups/:groupId/users/:userId/titles/equip` - 佩戴称号

### 无需鉴权的接口

以下接口可公开访问：

- `GET /config` - 获取插件配置
- `GET /groups` - 获取群列表
- `GET /checkin/groups/:groupId/users/:userId/points` - 查询用户积分
- `GET /checkin/groups/:groupId/users/:userId/points/history` - 查询积分历史
- `GET /v1/groups/:groupId/users/:userId/points` - 获取用户积分信息
- `GET /v1/groups/:groupId/users/:userId/balance/check` - 检查余额
- `GET /v1/groups/:groupId/users/:userId/transactions` - 获取交易流水
- `GET /v1/groups/:groupId/users/:userId/level` - 获取用户等级
- `GET /v1/groups/:groupId/users/:userId/titles` - 获取用户称号
- `GET /v1/groups/:groupId/titles` - 获取群称号列表
- `GET /v1/groups/:groupId/ranking/exp` - 按经验值排行
- `GET /v1/groups/:groupId/ranking/balance` - 按余额排行
- `GET /v1/levels/config` - 获取等级配置

### 错误码

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| -1 | 失败（见 message 字段） |
| 400 | 请求参数错误 |
| 401 | 未认证或认证失败 |
| 403 | 无权限访问 |
| 404 | 用户不存在 |
| 500 | 服务器内部错误 |

---

## v1 API 接口

### 积分管理

#### 1. 奖励积分（签到、活动等） [需要鉴权]
```
POST /v1/groups/{groupId}/users/{userId}/award
```

**请求参数：**
```json
{
  "amount": 100,
  "description": "每日签到奖励",
  "source": "signin",
  "applyLevelBonus": true,
  "multiplier": 1
}
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "success": true,
    "awarded": {
      "base": 100,
      "levelBonus": 5,
      "total": 105
    },
    "newExp": 1105,
    "newBalance": 205,
    "newLevel": 3,
    "levelUp": true
  }
}
```

#### 2. 消费积分（购买道具等） [需要鉴权]
```
POST /v1/groups/{groupId}/users/{userId}/consume
```

**请求参数：**
```json
{
  "amount": 50,
  "description": "购买道具",
  "idempotencyKey": "order-123456",
  "orderId": "order-123456"
}
```

**注意：** `idempotencyKey` 为必填，防止重复扣款

#### 3. 检查余额 [无需鉴权]
```
GET /v1/groups/{groupId}/users/{userId}/balance/check?required=100
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "balance": 200,
    "sufficient": true,
    "required": 100
  }
}
```

#### 4. 获取用户积分信息 [无需鉴权]
```
GET /v1/groups/{groupId}/users/{userId}/points
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "userId": "123456",
    "nickname": "用户名",
    "totalExp": 1105,
    "balance": 205,
    "level": 3,
    "levelName": "小有名气",
    "levelIcon": "🌟"
  }
}
```

#### 5. 获取交易流水 [无需鉴权]
```
GET /v1/groups/{groupId}/users/{userId}/transactions?limit=50
```

### 等级系统

#### 6. 获取等级配置 [无需鉴权]
```
GET /v1/levels/config
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "levels": [
      { "level": 1, "name": "初来乍到", "minExp": 0, "icon": "🌱" },
      { "level": 2, "name": "初露锋芒", "minExp": 100, "icon": "🌿" }
    ]
  }
}
```

#### 7. 获取用户等级信息 [无需鉴权]
```
GET /v1/groups/{groupId}/users/{userId}/level
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "userId": "123456",
    "nickname": "用户名",
    "level": 3,
    "levelName": "小有名气",
    "levelIcon": "🌟",
    "totalExp": 1105,
    "nextLevelExp": 500,
    "expToNextLevel": 395,
    "privileges": {
      "signinBonus": 5
    }
  }
}
```

### 称号系统

#### 8. 获取群称号列表 [无需鉴权]

#### 9. 获取用户称号 [无需鉴权]

#### 10. 佩戴称号 [需要鉴权]

### 排行榜

#### 11. 按经验值排行 [无需鉴权]

#### 12. 按余额排行 [无需鉴权]

## 兼容旧 API

以下旧 API 仍然可用，但返回的数据格式已更新：

- `GET /checkin/groups/{groupId}/users/{userId}/points` - 返回 `totalExp` 和 `balance`
- `POST /checkin/groups/{groupId}/users/{userId}/points` - 操作 `balance` 字段
- `GET /checkin/groups/{groupId}/ranking` - 按 `totalExp` 排序

## 数据迁移

系统会自动检测旧数据格式并进行迁移：
- 旧 `totalPoints` → 新 `totalExp`（累计经验值，100%）
- 旧 `totalPoints` → 新 `balance`（可用余额，20%赠送）

迁移后的用户可以在 WebUI 的"数据清理"页面查看迁移状态。

## 常见问题

### Q: 为什么排行榜没有数据？
A: 请确认：
1. 用户是否在该群签到过（分群数据独立）
2. 检查周期是否正确（周榜从本周一开始）
3. 查看 `checkin-group-{groupId}.json` 文件是否存在

### Q: 在 A 群签到后，为什么 B 群不能签到？
A: 已修复！现在每群独立签到，A 群签到不影响 B 群。

### Q: 积分被扣了，但经验值没变？
A: 这是正常行为！消费积分只扣 `balance`，不影响 `totalExp`。

### Q: 如何查看用户的完整交易记录？
A: 使用 `/v1/groups/{groupId}/users/{userId}/transactions` 接口。

## 错误码

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| -1 | 失败（见 message 字段） |
| 400 | 请求参数错误 |
| 401 | 未认证或认证失败 |
| 403 | 无权限访问 |
| 404 | 用户不存在 |
| 500 | 服务器内部错误 |

## 幂等性

所有写操作（奖励、消费）都支持幂等键：
- 使用 `idempotencyKey` 防止重复操作
- 相同的幂等键在 24 小时内返回相同结果
- 建议格式：`{action}-{userId}-{timestamp}` 或 `{orderId}`

## v2 API 接口（签到日志系统）

### 日志查询

#### 1. 分页查询日志
```
GET /logs
```

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 50 |
| userId | string | 否 | 按用户ID筛选 |
| groupId | string | 否 | 按群ID筛选 |
| userNickname | string | 否 | 按用户昵称模糊搜索 |
| groupName | string | 否 | 按群名称模糊搜索 |
| startDate | string | 否 | 开始日期 (YYYY-MM-DD) |
| endDate | string | 否 | 结束日期 (YYYY-MM-DD) |
| status | 'success' \| 'failed' \| 'all' | 否 | 签到状态筛选 |
| order | 'desc' \| 'asc' | 否 | 排序方式，默认 desc |

**响应：**
```json
{
  "code": 0,
  "data": {
    "logs": [
      {
        "id": "log-xxx",
        "userId": "123456",
        "nickname": "用户名",
        "groupId": "987654",
        "groupName": "测试群",
        "timestamp": 1707234567890,
        "date": "2026-02-11",
        "time": "14:30:25",
        "earnedPoints": 25,
        "consecutiveBonus": 6,
        "weekendBonus": 0,
        "totalPoints": 1105,
        "totalCheckinDays": 50,
        "consecutiveDays": 3,
        "todayRank": 5,
        "status": "success"
      }
    ],
    "total": 1000,
    "page": 1,
    "pageSize": 50
  }
}
```

#### 2. 获取日志统计
```
GET /logs/stats?timeRange=all
```

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| timeRange | 'today' \| 'week' \| 'month' \| 'all' | 否 | 时间范围，默认 all |

**响应：**
```json
{
  "code": 0,
  "data": {
    "totalLogs": 5000,
    "successCount": 4800,
    "failedCount": 200,
    "successRate": 96,
    "totalPointsEarned": 120000,
    "totalUsers": 150,
    "totalGroups": 20
  }
}
```

#### 3. 获取每日签到趋势
```
GET /logs/trend?days=30
```

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| days | number | 否 | 获取天数，默认 30 |

**响应：**
```json
{
  "code": 0,
  "data": {
    "trend": [
      {
        "date": "2026-02-01",
        "checkinCount": 50,
        "totalPoints": 1250
      },
      {
        "date": "2026-02-02",
        "checkinCount": 45,
        "totalPoints": 1100
      }
    ]
  }
}
```

#### 4. 获取用户签到日志
```
GET /logs/users/{userId}?page=1&pageSize=50&groupId=
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "logs": [...],
    "total": 100,
    "page": 1,
    "pageSize": 50
  }
}
```

#### 5. 获取群组签到日志
```
GET /logs/groups/{groupId}?page=1&pageSize=50
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "logs": [...],
    "total": 500,
    "page": 1,
    "pageSize": 50
  }
}
```

#### 6. 获取单条日志详情
```
GET /logs/{id}
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "id": "log-xxx",
    "userId": "123456",
    "nickname": "用户名",
    "groupId": "987654",
    "groupName": "测试群",
    "timestamp": 1707234567890,
    "date": "2026-02-11",
    "time": "14:30:25",
    "earnedPoints": 25,
    "consecutiveBonus": 6,
    "weekendBonus": 0,
    "totalPoints": 1105,
    "totalCheckinDays": 50,
    "consecutiveDays": 3,
    "todayRank": 5,
    "status": "success"
  }
}
```

#### 7. 获取用户日志数量
```
GET /logs/users/{userId}/count
```

**响应：**
```json
{
  "code": 0,
  "data": { "count": 100 }
}
```

#### 8. 获取群组日志数量
```
GET /logs/groups/{groupId}/count
```

**响应：**
```json
{
  "code": 0,
  "data": { "count": 500 }
}
```

### 日志配置

#### 9. 获取所有群日志配置
```
GET /logs/config
```

**响应：**
```json
{
  "code": 0,
  "data": [
    {
      "groupId": "123456",
      "enabled": true,
      "enableStats": true,
      "retentionDays": 90
    }
  ]
}
```

#### 10. 获取单个群日志配置
```
GET /logs/config/{groupId}
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "groupId": "123456",
    "enabled": true,
    "enableStats": true,
    "retentionDays": 90
  }
}
```

#### 11. 更新群日志配置
```
POST /logs/config/{groupId}
```

**请求参数：**
```json
{
  "enabled": true,
  "enableStats": true,
  "retentionDays": 90
}
```

**响应：**
```json
{
  "code": 0,
  "message": "配置已更新"
}
```

#### 12. 删除过期日志
```
POST /logs/cleanup?days=30
```

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| days | number | 是 | 删除多少天前的日志 |

**响应：**
```json
{
  "code": 0,
  "data": { "deletedCount": 150 }
}
```

## 统计数据接口

### 13. 获取今日签到统计
```
GET /checkin/today-stats
```

**响应：**
```json
{
  "code": 0,
  "data": { "todayCheckins": 25 }
}
```

### 14. 获取活跃排行榜
```
GET /checkin/active-ranking
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "totalUsers": 150,
    "rankingType": "active",
    "rankingDescription": "按使用天数排行，每天首次使用机器人计1天",
    "ranking": [
      {
        "userId": "123456",
        "nickname": "用户名",
        "activeDays": 50,
        "totalCheckinDays": 48,
        "lastActiveDate": "2026-02-11"
      }
    ]
  }
}
```

### 15. 获取签到统计数据
```
GET /checkin/stats
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "totalUsers": 150,
    "totalCheckins": 5000,
    "todayCheckins": 30,
    "activeUsers": 80
  }
}
```

## 排行榜接口

### 16. 获取群排行榜数据
```
GET /leaderboard/{groupId}?type=week
```

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | 'week' \| 'month' \| 'year' \| 'all' | 否 | 排行榜类型，默认 week |

**响应：**
```json
{
  "code": 0,
  "data": {
    "type": "week",
    "groupId": "123456",
    "updateTime": "2026-02-11T14:30:00Z",
    "ranking": [
      {
        "rank": 1,
        "userId": "123456",
        "nickname": "用户名",
        "avatarUrl": "https://...",
        "periodPoints": 150,
        "totalPoints": 1105,
        "checkinDays": 7
      }
    ],
    "myRank": {
      "rank": 5,
      "userId": "654321",
      "nickname": "我的昵称",
      "avatarUrl": "https://...",
      "periodPoints": 80
    }
  }
}
```

## 用户数据接口

### 17. 获取用户分群余额详情
```
GET /checkin/user/{userId}/balance
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "userId": "123456",
    "groupCount": 5,
    "groups": [
      {
        "groupId": "987654",
        "groupName": "测试群",
        "balance": 200,
        "totalExp": 1105,
        "totalCheckinDays": 50
      }
    ]
  }
}
```

### 18. 获取所有用户数据（管理用）
```
GET /checkin/users
```

**响应：**
```json
{
  "code": 0,
  "data": [
    {
      "userId": "123456",
      "nickname": "用户名",
      "totalPoints": 1000,
      "totalCheckinDays": 50,
      "consecutiveDays": 3,
      "lastCheckinDate": "2026-02-11"
    }
  ]
}
```

## 群签到数据接口

### 19. 获取所有群签到统计
```
GET /checkin/groups
```

**响应：**
```json
{
  "code": 0,
  "data": [
    {
      "groupId": "123456",
      "groupName": "测试群",
      "totalCheckins": 500,
      "totalPoints": 12500,
      "todayCheckins": 25,
      "totalUsers": 50
    }
  ]
}
```

### 20. 获取指定群签到统计
```
GET /checkin/groups/{groupId}
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "groupId": "123456",
    "groupName": "测试群",
    "totalCheckins": 500,
    "totalPoints": 12500,
    "todayCheckins": 25,
    "totalUsers": 50
  }
}
```

### 21. 获取指定群积分排行
```
GET /checkin/groups/{groupId}/ranking
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "groupId": "123456",
    "totalUsers": 50,
    "ranking": [
      {
        "userId": "123456",
        "nickname": "用户名",
        "totalExp": 1105,
        "balance": 200,
        "totalCheckinDays": 50,
        "consecutiveDays": 3,
        "lastCheckinDate": "2026-02-11"
      }
    ]
  }
}
```

### 22. 获取指定群签到排行（含活跃天数）
```
GET /checkin/groups/{groupId}/checkin-ranking
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "groupId": "123456",
    "totalUsers": 50,
    "ranking": [
      {
        "userId": "123456",
        "nickname": "用户名",
        "totalExp": 1105,
        "balance": 200,
        "totalCheckinDays": 50,
        "consecutiveDays": 3,
        "lastCheckinDate": "2026-02-11",
        "activeDays": 48
      }
    ]
  }
}
```

## 旧版积分管理接口（兼容）

### 23. 获取积分变更历史 [无需鉴权]
```
GET /checkin/groups/{groupId}/users/{userId}/points/history?limit=50
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "userId": "123456",
    "groupId": "987654",
    "totalRecords": 10,
    "history": [
      {
        "timestamp": 1707234567890,
        "date": "2026-02-11",
        "time": "14:30:25",
        "points": -100,
        "balance": 400,
        "type": "exchange",
        "description": "兑换奖励-精美头像框",
        "operatorId": "admin123"
      }
    ]
  }
}
```

### 24. 重置用户积分 [需要鉴权]
```
POST /checkin/groups/{groupId}/users/{userId}/points/reset
```

**请求参数：**
```json
{
  "description": "违规处罚-积分清零",
  "operatorId": "admin123"
}
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "userId": "123456",
    "groupId": "987654",
    "newBalance": 0,
    "message": "积分已重置"
  }
}
```

## 数据管理接口

### 25. 清理旧数据
```
POST /checkin/cleanup
```

**请求参数：**
```json
{
  "daysToKeep": 90
}
```

**响应：**
```json
{
  "code": 0,
  "message": "清理完成"
}
```
