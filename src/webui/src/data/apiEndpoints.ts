import type { ApiEndpoint } from '../types/api';

export const API_ENDPOINTS: ApiEndpoint[] = [
    {
        id: 'status',
        method: 'GET',
        path: '/status',
        title: '获取插件状态',
        description: '获取插件运行状态、配置和统计数据',
        response: `{
  "code": 0,
  "data": {
    "pluginName": "napcat-plugin-checkin",
    "uptime": 3600,
    "uptimeFormatted": "1h 0m 0s",
    "config": { ... },
    "stats": {
      "processed": 100,
      "todayProcessed": 10
    }
  }
}`
    },
    {
        id: 'today-stats',
        method: 'GET',
        path: '/checkin/today-stats',
        title: '今日签到统计',
        description: '获取今日签到人数统计',
        response: `{
  "code": 0,
  "data": {
    "todayCheckins": 25
  }
}`
    },
    {
        id: 'active-ranking',
        method: 'GET',
        path: '/checkin/active-ranking',
        title: '活跃排行榜',
        description: '获取全服活跃排行榜（按使用天数排序，每人只算一次）',
        response: `{
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
        "totalExp": 1000,
        "lastActiveDate": "2026-02-11"
      }
    ]
  }
}`
    },
    {
        id: 'checkin-stats',
        method: 'GET',
        path: '/checkin/stats',
        title: '签到统计',
        description: '获取签到统计数据（用户数、总签到数、今日签到数、活跃用户数）',
        response: `{
  "code": 0,
  "data": {
    "totalUsers": 150,
    "totalCheckins": 5000,
    "todayCheckins": 30,
    "activeUsers": 80
  }
}`
    },
    {
        id: 'groups',
        method: 'GET',
        path: '/groups',
        title: '获取群列表',
        description: '获取所有群及其配置信息（包含群头像、成员数等）',
        response: `{
  "code": 0,
  "data": [
    {
      "group_id": 123456,
      "group_name": "测试群",
      "member_count": 500,
      "max_member_count": 500,
      "enabled": true,
      "enableCheckin": true
    }
  ]
}`
    },
    {
        id: 'update-group-config',
        method: 'POST',
        path: '/groups/:id/config',
        title: '更新群配置',
        authRequired: true,
        description: '更新指定群的配置（启用状态、签到开关）',
        params: [
            { name: 'enabled', type: 'boolean', required: false, description: '是否启用此群' },
            { name: 'enableCheckin', type: 'boolean', required: false, description: '是否启用群内签到' },
        ],
        example: `{
  "enableCheckin": true
}`,
        response: `{
  "code": 0,
  "message": "ok"
}`
    },
    {
        id: 'bulk-group-config',
        method: 'POST',
        path: '/groups/bulk-config',
        title: '批量更新群配置',
        authRequired: true,
        description: '批量更新多个群的配置',
        params: [
            { name: 'enabled', type: 'boolean', required: true, description: '是否启用' },
            { name: 'enableCheckin', type: 'boolean', required: false, description: '是否启用签到' },
            { name: 'groupIds', type: 'array', required: true, description: '群ID列表' },
        ],
        example: `{
  "enabled": true,
  "enableCheckin": true,
  "groupIds": [123456, 789012]
}`,
        response: `{
  "code": 0,
  "message": "ok"
}`
    },
    {
        id: 'user-checkin-data',
        method: 'GET',
        path: '/checkin/user/:id',
        title: '用户签到数据',
        description: '获取指定用户的签到详情（可选指定群，不指定则返回全局数据）',
        params: [
            { name: 'groupId', type: 'string', required: false, description: '群ID（可选）' },
        ],
        response: `{
  "code": 0,
  "data": {
    "userId": "1150880493",
    "nickname": "Final",
    "totalExp": 1000,
    "balance": 200,
    "totalCheckinDays": 50,
    "consecutiveDays": 3,
    "lastCheckinDate": "2026-02-11"
  }
}`
    },
    {
        id: 'user-balance',
        method: 'GET',
        path: '/checkin/user/:userId/balance',
        title: '用户分群余额详情',
        description: '获取用户在所有群的余额详情（按余额降序排列）',
        response: `{
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
}`
    },
    {
        id: 'all-users',
        method: 'GET',
        path: '/checkin/users',
        title: '所有用户数据',
        description: '获取所有用户数据（管理用）',
        response: `{
  "code": 0,
  "data": [
    {
      "userId": "123456",
      "nickname": "用户名",
      "totalExp": 1000,
      "totalCheckinDays": 50,
      "consecutiveDays": 3,
      "lastCheckinDate": "2026-02-11"
    }
  ]
}`
    },
    {
        id: 'group-stats',
        method: 'GET',
        path: '/checkin/groups/:id',
        title: '群签到统计',
        description: '获取指定群的签到统计',
        response: `{
  "code": 0,
  "data": {
    "groupId": "123456",
    "groupName": "测试群",
    "totalCheckins": 500,
    "totalPoints": 12500,
    "todayCheckins": 25,
    "totalUsers": 50
  }
}`
    },
    {
        id: 'all-groups-stats',
        method: 'GET',
        path: '/checkin/groups',
        title: '所有群签到统计',
        description: '获取所有群的签到统计',
        response: `{
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
}`
    },
    {
        id: 'group-ranking',
        method: 'GET',
        path: '/checkin/groups/:id/ranking',
        title: '群内积分排行',
        description: '获取指定群的积分排行（按totalExp排序）',
        response: `{
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
}`
    },
    {
        id: 'group-checkin-ranking',
        method: 'GET',
        path: '/checkin/groups/:id/checkin-ranking',
        title: '群内签到排行',
        description: '获取指定群的签到排行（按签到天数排序，含活跃天数）',
        response: `{
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
}`
    },
    {
        id: 'global-ranking',
        method: 'GET',
        path: '/checkin/ranking',
        title: '全服积分排行',
        description: '获取全服积分排行榜 TOP100（按活跃天数排序，每人只算一次）',
        response: `{
  "code": 0,
  "data": {
    "totalUsers": 150,
    "ranking": [
      {
        "userId": "1150880493",
        "nickname": "Final",
        "activeDays": 50,
        "totalCheckinDays": 48,
        "lastActiveDate": "2026-02-11"
      }
    ]
  }
}`
    },
    {
        id: 'get-user-points',
        method: 'GET',
        path: '/checkin/groups/:groupId/users/:userId/points',
        title: '获取用户积分',
        description: '获取指定用户在群内的积分详情',
        response: `{
  "code": 0,
  "data": {
    "userId": "1150880493",
    "nickname": "Final",
    "totalExp": 1105,
    "balance": 200,
    "level": 3,
    "levelName": "小有名气"
  }
}`
    },
    {
        id: 'update-user-points',
        method: 'POST',
        path: '/checkin/groups/:groupId/users/:userId/points',
        title: '修改用户积分',
        authRequired: true,
        description: '增加或减少用户的群内积分（用于兑换奖励等场景）',
        params: [
            { name: 'points', type: 'number', required: true, description: '变更积分（正数增加，负数减少）' },
            { name: 'description', type: 'string', required: true, description: '操作说明，如"兑换奖励-xxx"' },
            { name: 'type', type: 'string', required: false, description: '操作类型: signin/admin/exchange/other' },
            { name: 'operatorId', type: 'string', required: false, description: '操作者ID（管理员操作时记录）' },
        ],
        response: `{
  "code": 0,
  "data": {
    "userId": "1150880493",
    "groupId": "123456",
    "changedPoints": -100,
    "newBalance": 400,
    "description": "兑换奖励-精美头像框"
  }
}`,
        example: `{
  "points": -100,
  "description": "兑换奖励-精美头像框",
  "type": "exchange",
  "operatorId": "admin123"
}`
    },
    {
        id: 'get-points-history',
        method: 'GET',
        path: '/checkin/groups/:groupId/users/:userId/points/history',
        title: '积分变更历史',
        description: '获取用户积分的变更记录（支持兑换追溯）',
        params: [
            { name: 'limit', type: 'number', required: false, description: '返回条数限制（默认50）' },
        ],
        response: `{
  "code": 0,
  "data": {
    "userId": "1150880493",
    "groupId": "123456",
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
}`
    },
    {
        id: 'reset-user-points',
        method: 'POST',
        path: '/checkin/groups/:groupId/users/:userId/points/reset',
        title: '重置用户积分',
        authRequired: true,
        description: '将用户积分重置为0（谨慎使用，会记录操作日志）',
        params: [
            { name: 'description', type: 'string', required: false, description: '重置原因说明' },
            { name: 'operatorId', type: 'string', required: false, description: '操作者ID' },
        ],
        response: `{
  "code": 0,
  "data": {
    "userId": "1150880493",
    "groupId": "123456",
    "newBalance": 0,
    "message": "积分已重置"
  }
}`,
        example: `{
  "description": "违规处罚-积分清零",
  "operatorId": "admin123"
}`
    },
    {
        id: 'leaderboard',
        method: 'GET',
        path: '/leaderboard/:groupId',
        title: '群排行榜数据',
        description: '获取群排行榜数据（支持 week/month/year/all 四种类型）',
        params: [
            { name: 'type', type: 'string', required: false, description: '排行榜类型: week/month/year/all (默认week)' },
        ],
        response: `{
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
}`
    },
    {
        id: 'cleanup',
        method: 'POST',
        path: '/checkin/cleanup',
        title: '清理旧数据',
        description: '清理超过指定天数的旧签到记录',
        params: [
            { name: 'daysToKeep', type: 'number', required: false, description: '保留天数（默认90）' },
        ],
        response: `{
  "code": 0,
  "message": "清理完成"
}`
    },
    {
        id: 'logs',
        method: 'GET',
        path: '/logs',
        title: '分页查询日志',
        description: '分页查询签到日志，支持多种筛选条件',
        params: [
            { name: 'page', type: 'number', required: false, description: '页码（默认1）' },
            { name: 'pageSize', type: 'number', required: false, description: '每页条数（默认50）' },
            { name: 'userId', type: 'string', required: false, description: '按用户ID筛选' },
            { name: 'groupId', type: 'string', required: false, description: '按群ID筛选' },
            { name: 'userNickname', type: 'string', required: false, description: '按用户昵称模糊搜索' },
            { name: 'groupName', type: 'string', required: false, description: '按群名称模糊搜索' },
            { name: 'startDate', type: 'string', required: false, description: '开始日期（YYYY-MM-DD）' },
            { name: 'endDate', type: 'string', required: false, description: '结束日期（YYYY-MM-DD）' },
            { name: 'status', type: 'string', required: false, description: '状态筛选: success/failed/all' },
            { name: 'order', type: 'string', required: false, description: '排序方式: desc/asc（默认desc）' },
        ],
        response: `{
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
        "totalExp": 1105,
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
}`
    },
    {
        id: 'logs-stats',
        method: 'GET',
        path: '/logs/stats',
        title: '日志统计',
        description: '获取签到日志统计数据',
        params: [
            { name: 'timeRange', type: 'string', required: false, description: '时间范围: today/week/month/all（默认all）' },
        ],
        response: `{
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
}`
    },
    {
        id: 'logs-trend',
        method: 'GET',
        path: '/logs/trend',
        title: '每日签到趋势',
        description: '获取近N天的每日签到趋势',
        params: [
            { name: 'days', type: 'number', required: false, description: '获取天数（默认30）' },
        ],
        response: `{
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
}`
    },
    {
        id: 'logs-user',
        method: 'GET',
        path: '/logs/users/:userId',
        title: '用户签到日志',
        description: '获取指定用户的签到日志',
        params: [
            { name: 'page', type: 'number', required: false, description: '页码（默认1）' },
            { name: 'pageSize', type: 'number', required: false, description: '每页条数（默认50）' },
            { name: 'groupId', type: 'string', required: false, description: '按群ID筛选' },
            { name: 'startDate', type: 'string', required: false, description: '开始日期' },
            { name: 'endDate', type: 'string', required: false, description: '结束日期' },
        ],
        response: `{
  "code": 0,
  "data": {
    "logs": [...],
    "total": 100,
    "page": 1,
    "pageSize": 50
  }
}`
    },
    {
        id: 'logs-group',
        method: 'GET',
        path: '/logs/groups/:groupId',
        title: '群组签到日志',
        description: '获取指定群组的签到日志',
        params: [
            { name: 'page', type: 'number', required: false, description: '页码（默认1）' },
            { name: 'pageSize', type: 'number', required: false, description: '每页条数（默认50）' },
            { name: 'userId', type: 'string', required: false, description: '按用户ID筛选' },
            { name: 'startDate', type: 'string', required: false, description: '开始日期' },
            { name: 'endDate', type: 'string', required: false, description: '结束日期' },
        ],
        response: `{
  "code": 0,
  "data": {
    "logs": [...],
    "total": 500,
    "page": 1,
    "pageSize": 50
  }
}`
    },
    {
        id: 'logs-detail',
        method: 'GET',
        path: '/logs/:id',
        title: '单条日志详情',
        description: '获取单条签到日志的详细信息',
        response: `{
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
    "totalExp": 1105,
    "totalCheckinDays": 50,
    "consecutiveDays": 3,
    "todayRank": 5,
    "status": "success"
  }
}`
    },
    {
        id: 'logs-user-count',
        method: 'GET',
        path: '/logs/users/:userId/count',
        title: '用户日志数量',
        description: '获取指定用户的签到日志数量',
        response: `{
  "code": 0,
  "data": { "count": 100 }
}`
    },
    {
        id: 'logs-group-count',
        method: 'GET',
        path: '/logs/groups/:groupId/count',
        title: '群组日志数量',
        description: '获取指定群组的签到日志数量',
        response: `{
  "code": 0,
  "data": { "count": 500 }
}`
    },
    {
        id: 'logs-config',
        method: 'GET',
        path: '/logs/config',
        title: '所有群日志配置',
        description: '获取所有群组的日志配置',
        response: `{
  "code": 0,
  "data": [
    {
      "groupId": "123456",
      "enabled": true,
      "enableStats": true,
      "retentionDays": 90
    }
  ]
}`
    },
    {
        id: 'logs-config-detail',
        method: 'GET',
        path: '/logs/config/:groupId',
        title: '群日志配置',
        description: '获取指定群组的日志配置',
        response: `{
  "code": 0,
  "data": {
    "groupId": "123456",
    "enabled": true,
    "enableStats": true,
    "retentionDays": 90
  }
}`
    },
    {
        id: 'logs-config-update',
        method: 'POST',
        path: '/logs/config/:groupId',
        title: '更新群日志配置',
        authRequired: true,
        description: '更新指定群组的日志配置',
        params: [
            { name: 'enabled', type: 'boolean', required: false, description: '是否启用日志' },
            { name: 'enableStats', type: 'boolean', required: false, description: '是否启用统计' },
            { name: 'retentionDays', type: 'number', required: false, description: '日志保留天数' },
        ],
        response: `{
  "code": 0,
  "message": "配置已更新"
}`,
        example: `{
  "enabled": true,
  "enableStats": true,
  "retentionDays": 90
}`
    },
    {
        id: 'logs-cleanup',
        method: 'POST',
        path: '/logs/cleanup',
        title: '删除过期日志',
        authRequired: true,
        description: '删除超过指定天数的过期日志',
        params: [
            { name: 'days', type: 'number', required: true, description: '删除多少天前的日志' },
        ],
        response: `{
  "code": 0,
  "data": { "deletedCount": 150 }
}`
    },
    {
        id: 'v1-award',
        method: 'POST',
        path: '/v1/groups/:groupId/users/:userId/award',
        title: '奖励积分（v1）',
        authRequired: true,
        description: '奖励积分给用户（双轨制积分系统）',
        params: [
            { name: 'amount', type: 'number', required: true, description: '奖励积分数量（正数）' },
            { name: 'description', type: 'string', required: true, description: '奖励说明' },
            { name: 'source', type: 'string', required: false, description: '来源: signin/consecutive/activity/admin' },
            { name: 'applyLevelBonus', type: 'boolean', required: false, description: '是否应用等级加成（默认true）' },
            { name: 'multiplier', type: 'number', required: false, description: '倍率' },
        ],
        response: `{
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
}`,
        example: `{
  "amount": 100,
  "description": "每日签到奖励",
  "source": "signin",
  "applyLevelBonus": true,
  "multiplier": 1
}`
    },
    {
        id: 'v1-consume',
        method: 'POST',
        path: '/v1/groups/:groupId/users/:userId/consume',
        title: '消费积分（v1）',
        authRequired: true,
        description: '消费用户积分（双轨制积分系统，需提供幂等键）',
        params: [
            { name: 'amount', type: 'number', required: true, description: '消费积分数量（正数）' },
            { name: 'description', type: 'string', required: true, description: '消费说明' },
            { name: 'idempotencyKey', type: 'string', required: true, description: '幂等键（防止重复扣款）' },
            { name: 'orderId', type: 'string', required: false, description: '订单ID' },
        ],
        response: `{
  "code": 0,
  "data": {
    "success": true,
    "consumed": {
      "base": 50,
      "description": "购买道具"
    },
    "newExp": 1105,
    "newBalance": 155,
    "transactionId": "tx-xxx"
  }
}`,
        example: `{
  "amount": 50,
  "description": "购买道具",
  "idempotencyKey": "order-123456",
  "orderId": "order-123456"
}`
    },
    {
        id: 'v1-balance-check',
        method: 'GET',
        path: '/v1/groups/:groupId/users/:userId/balance/check',
        title: '检查余额（v1）',
        description: '检查用户余额是否足够',
        params: [
            { name: 'required', type: 'number', required: false, description: ' required=100 查询所需积分' },
        ],
        response: `{
  "code": 0,
  "data": {
    "balance": 200,
    "sufficient": true,
    "required": 100
  }
}`
    },
    {
        id: 'v1-points',
        method: 'GET',
        path: '/v1/groups/:groupId/users/:userId/points',
        title: '用户积分信息（v1）',
        description: '获取用户在群内的积分信息（双轨制积分系统）',
        response: `{
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
}`
    },
    {
        id: 'v1-transactions',
        method: 'GET',
        path: '/v1/groups/:groupId/users/:userId/transactions',
        title: '交易流水（v1）',
        description: '获取用户积分交易流水记录',
        params: [
            { name: 'limit', type: 'number', required: false, description: '返回条数限制（默认50）' },
        ],
        response: `{
  "code": 0,
  "data": {
    "userId": "123456",
    "groupId": "987654",
    "totalRecords": 10,
    "transactions": [...]
  }
}`
    },
    {
        id: 'v1-levels-config',
        method: 'GET',
        path: '/v1/levels/config',
        title: '等级配置（v1）',
        description: '获取等级系统配置',
        response: `{
  "code": 0,
  "data": {
    "levels": [
      { "level": 1, "name": "初来乍到", "minExp": 0, "icon": "🌱" },
      { "level": 2, "name": "初露锋芒", "minExp": 100, "icon": "🌿" }
    ],
    "defaultTitles": [...]
  }
}`
    },
    {
        id: 'v1-user-level',
        method: 'GET',
        path: '/v1/groups/:groupId/users/:userId/level',
        title: '用户等级信息（v1）',
        description: '获取用户在群内的等级信息（双轨制积分系统）',
        response: `{
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
}`
    },
    {
        id: 'v1-titles',
        method: 'GET',
        path: '/v1/groups/:groupId/titles',
        title: '群称号列表（v1）',
        description: '获取群内所有可用称号',
        response: `{
  "code": 0,
  "data": {
    "groupId": "123456",
    "titles": [...]
  }
}`
    },
    {
        id: 'v1-user-titles',
        method: 'GET',
        path: '/v1/groups/:groupId/users/:userId/titles',
        title: '用户称号列表（v1）',
        description: '获取用户已获得的称号列表',
        response: `{
  "code": 0,
  "data": {
    "userId": "123456",
    "groupId": "987654",
    "titles": [...]
  }
}`
    },
    {
        id: 'v1-equip-title',
        method: 'POST',
        path: '/v1/groups/:groupId/users/:userId/titles/equip',
        title: '佩戴称号（v1）',
        authRequired: true,
        description: '为用户佩戴称号',
        params: [
            { name: 'titleId', type: 'string', required: true, description: '称号ID' },
        ],
        response: `{
  "code": 0,
  "data": {
    "success": true,
    "equippedTitle": {
      "id": "level-3",
      "name": "小有名气"
    }
  }
}`,
        example: `{
  "titleId": "level-3"
}`
    },
    {
        id: 'v1-ranking-exp',
        method: 'GET',
        path: '/v1/groups/:groupId/ranking/exp',
        title: '经验值排行（v1）',
        description: '获取群内按经验值排行（双轨制积分系统）',
        params: [
            { name: 'limit', type: 'number', required: false, description: '返回条数限制（默认50）' },
        ],
        response: `{
  "code": 0,
  "data": {
    "groupId": "123456",
    "rankingType": "exp",
    "totalUsers": 50,
    "ranking": [
      {
        "rank": 1,
        "userId": "123456",
        "nickname": "用户名",
        "totalExp": 1105,
        "level": 3,
        "levelName": "小有名气"
      }
    ]
  }
}`
    },
    {
        id: 'v1-ranking-balance',
        method: 'GET',
        path: '/v1/groups/:groupId/ranking/balance',
        title: '余额排行（v1）',
        description: '获取群内按余额排行（双轨制积分系统）',
        params: [
            { name: 'limit', type: 'number', required: false, description: '返回条数限制（默认50）' },
        ],
        response: `{
  "code": 0,
  "data": {
    "groupId": "123456",
    "rankingType": "balance",
    "totalUsers": 50,
    "ranking": [
      {
        "rank": 1,
        "userId": "123456",
        "nickname": "用户名",
        "balance": 200,
        "level": 3,
        "levelName": "小有名气"
      }
    ]
  }
}`
    },
    {
        id: 'templates-list',
        method: 'GET',
        path: '/templates',
        title: '获取所有模板',
        description: '获取所有签到和排行榜模板列表',
        response: `{
  "code": 0,
  "data": [
    {
      "id": "default-checkin",
      "name": "默认签到模板",
      "type": "checkin",
      "html": "...",
      "isDefault": true
    }
  ]
}`
    },
    {
        id: 'templates-get',
        method: 'GET',
        path: '/templates/:id',
        title: '获取单个模板',
        description: '根据模板 ID 获取模板详情',
        response: `{
  "code": 0,
  "data": {
    "id": "default-checkin",
    "name": "默认签到模板",
    "type": "checkin",
    "html": "<html>...",
    "isDefault": true,
    "createdAt": "2026-02-01T10:00:00Z",
    "updatedAt": "2026-02-10T10:00:00Z"
  }
}`
    },
    {
        id: 'templates-by-type',
        method: 'GET',
        path: '/templates/type/:type',
        title: '按类型获取模板',
        description: '根据模板类型（checkin/leaderboard）获取模板列表',
        response: `{
  "code": 0,
  "data": [
    {
      "id": "default-checkin",
      "name": "默认签到模板",
      "type": "checkin",
      "html": "...",
      "isDefault": true
    }
  ]
}`
    },
    {
        id: 'templates-create',
        method: 'POST',
        path: '/templates',
        title: '创建模板',
        description: '创建新的签到或排行榜模板',
        params: [
            { name: 'name', type: 'string', required: true, description: '模板名称' },
            { name: 'type', type: 'string', required: true, description: '模板类型: checkin | leaderboard' },
            { name: 'html', type: 'string', required: true, description: '模板 HTML 内容' },
            { name: 'description', type: 'string', required: false, description: '模板描述' },
        ],
        response: `{
  "code": 0,
  "data": {
    "id": "template-xxx",
    "name": "新模板",
    "type": "checkin",
    "html": "...",
    "isDefault": false,
    "createdAt": "2026-02-12T10:00:00Z",
    "updatedAt": "2026-02-12T10:00:00Z"
  }
}`,
        example: `{
  "name": "新年主题签到",
  "type": "checkin",
  "html": "<html><body>新年快乐 {{nickname}}</body></html>",
  "description": "新年主题签到卡片"
}`
    },
    {
        id: 'templates-update',
        method: 'PUT',
        path: '/templates/:id',
        title: '更新模板',
        description: '更新指定模板的内容和属性',
        params: [
            { name: 'name', type: 'string', required: false, description: '模板名称' },
            { name: 'html', type: 'string', required: false, description: '模板 HTML 内容' },
            { name: 'description', type: 'string', required: false, description: '模板描述' },
        ],
        response: `{
  "code": 0,
  "data": {
    "id": "template-xxx",
    "name": "更新后的模板",
    "type": "checkin",
    "html": "...",
    "isDefault": false,
    "updatedAt": "2026-02-12T11:00:00Z"
  }
}`,
        example: `{
  "name": "更新后的模板名称",
  "html": "<html><body>更新后的内容</body></html>"
}`
    },
    {
        id: 'templates-delete',
        method: 'DELETE',
        path: '/templates/:id',
        title: '删除模板',
        description: '删除指定模板（不能删除系统默认模板）',
        response: `{
  "code": 0,
  "message": "删除成功"
}`
    },
    {
        id: 'templates-duplicate',
        method: 'POST',
        path: '/templates/:id/duplicate',
        title: '复制模板',
        description: '复制指定模板为新模板',
        params: [
            { name: 'name', type: 'string', required: false, description: '新模板名称（可选）' },
        ],
        response: `{
  "code": 0,
  "data": {
    "id": "template-yyy",
    "name": "复制-默认签到模板",
    "type": "checkin",
    "html": "...",
    "isDefault": false
  }
}`
    },
    {
        id: 'templates-set-default',
        method: 'POST',
        path: '/templates/:id/set-default',
        title: '设置默认模板',
        description: '将指定模板设置为对应类型的默认模板',
        response: `{
  "code": 0,
  "message": "设置成功"
}`
    },
    {
        id: 'templates-config-get',
        method: 'GET',
        path: '/templates/config',
        title: '获取模板配置',
        description: '获取当前模板配置（随机模式、指定模板等）',
        response: `{
  "code": 0,
  "data": {
    "randomMode": "none",
    "checkinTemplateId": null,
    "leaderboardTemplateId": null,
    "defaultCheckinTemplateId": null,
    "defaultLeaderboardTemplateId": null,
    "sequentialIndex": 0,
    "lastRotationDate": ""
  }
}`
    },
    {
        id: 'templates-config-save',
        method: 'POST',
        path: '/templates/config',
        title: '保存模板配置',
        description: '更新模板配置（随机模式、指定模板）',
        params: [
            { name: 'randomMode', type: 'string', required: false, description: '随机模式: none | random | sequential | daily' },
            { name: 'checkinTemplateId', type: 'string', required: false, description: '指定签到模板 ID（null 为使用默认）' },
            { name: 'leaderboardTemplateId', type: 'string', required: false, description: '指定排行榜模板 ID（null 为使用默认）' },
        ],
        response: `{
  "code": 0,
  "message": "配置已更新"
}`,
        example: `{
  "randomMode": "random",
  "checkinTemplateId": "my-custom-template",
  "leaderboardTemplateId": null
}`
    },
    {
        id: 'templates-init',
        method: 'POST',
        path: '/templates/init-defaults',
        title: '初始化默认模板',
        description: '重新初始化默认模板（会恢复系统默认模板）',
        response: `{
  "code": 0,
  "message": "初始化成功"
}`
    },
    {
        id: 'get-config',
        method: 'GET',
        path: '/config',
        title: '获取配置',
        description: '获取插件所有配置项',
        response: `{
  "code": 0,
  "data": {
    "enabled": true,
    "commandPrefix": "#cmd",
    "enableCheckin": true,
    ...
  }
}`
    },
    {
        id: 'post-config',
        method: 'POST',
        path: '/config',
        title: '保存配置',
        description: '更新插件配置',
        params: [
            { name: 'enabled', type: 'boolean', required: false, description: '是否启用插件' },
            { name: 'commandPrefix', type: 'string', required: false, description: '命令前缀' },
            { name: 'checkinCommands', type: 'string', required: false, description: '签到命令列表（逗号分隔）' },
            { name: 'checkinReplyMode', type: 'string', required: false, description: '回复模式: text | image | auto' },
        ],
        example: `{
  "enabled": true,
  "checkinCommands": "签到,打卡,sign"
}`,
        response: `{
  "code": 0,
  "message": "ok"
}`
    },
    {
        id: 'template-preview',
        method: 'POST',
        path: '/template/preview',
        title: '预览模板',
        description: '预览自定义HTML模板渲染效果。支持签到卡片和排行榜卡片两种类型',
        params: [
            { name: 'template', type: 'string', required: true, description: 'HTML模板字符串' },
            { name: 'data', type: 'object', required: false, description: '模板变量数据' },
            { name: 'type', type: 'string', required: false, description: '模板类型: checkin | leaderboard (默认checkin)' },
        ],
        response: `{
  "code": 0,
  "data": {
    "image": "data:image/png;base64,...",
    "time": 150
  }
}`,
        example: `// 签到卡片
{
  "template": "<html>...{{nickname}}...</html>",
  "data": {
    "nickname": "Final",
    "earnedPoints": 21
  }
}

// 排行榜卡片
{
  "template": "<html>...{{typeName}}...</html>",
  "data": {
    "type": "week",
    "typeName": "本周排行榜",
    "groupId": "123456",
    "usersJson": "[{rank:1,nickname:\"User1\",...}]",
    "myRankJson": "{rank:5,nickname:\"Me\",...}",
    "maxPoints": "1000"
  },
  "type": "leaderboard"
}`
    },
];
