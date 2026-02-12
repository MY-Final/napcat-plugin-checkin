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

## v1 API 接口

### 积分管理

#### 1. 奖励积分（签到、活动等）
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

#### 2. 消费积分（购买道具等）
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

#### 3. 检查余额
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

#### 4. 获取用户积分信息
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

#### 5. 获取交易流水
```
GET /v1/groups/{groupId}/users/{userId}/transactions?limit=50
```

### 等级系统

#### 6. 获取等级配置
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

#### 7. 获取用户等级信息
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

#### 8. 获取群称号列表
```
GET /v1/groups/{groupId}/titles
```

#### 9. 获取用户称号
```
GET /v1/groups/{groupId}/users/{userId}/titles
```

#### 10. 佩戴称号
```
POST /v1/groups/{groupId}/users/{userId}/titles/equip
```

**请求参数：**
```json
{
  "titleId": "level-3"
}
```

### 排行榜

#### 11. 按经验值排行
```
GET /v1/groups/{groupId}/ranking/exp?limit=50
```

#### 12. 按余额排行
```
GET /v1/groups/{groupId}/ranking/balance?limit=50
```

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
| 404 | 用户不存在 |
| 500 | 服务器内部错误 |

## 幂等性

所有写操作（奖励、消费）都支持幂等键：
- 使用 `idempotencyKey` 防止重复操作
- 相同的幂等键在 24 小时内返回相同结果
- 建议格式：`{action}-{userId}-{timestamp}` 或 `{orderId}`
