# 更新日志

## [1.0.4] - 2026-02-11

### 新增功能

#### 1. 活跃排行系统
- **新增活跃天数统计**：记录用户每天首次使用机器人的天数（用于识别忠实用户）
- **全服活跃排行页面**：按活跃天数排序，识别最忠实的用户
- **活跃排行 API**：`/checkin/active-ranking` 接口
- **Bot 命令**：`#cmd 活跃排行` 可查看全服活跃排行

#### 2. 群用户积分管理 API（CRUD）
- **查询积分**：`GET /checkin/groups/:groupId/users/:userId/points`
- **修改积分**：`POST /checkin/groups/:groupId/users/:userId/points`（支持增加/减少）
- **积分历史**：`GET /checkin/groups/:groupId/users/:userId/points/history`
- **重置积分**：`POST /checkin/groups/:groupId/users/:userId/points/reset`
- **积分变更记录**：自动记录每次积分变动，支持兑换追溯

#### 3. WebUI 界面优化
- **新增使用说明页面**：详细介绍插件功能、命令列表、扩展开发指南
- **侧边栏重构**：
  - 仪表盘
  - 使用说明（新增）
  - 插件配置
  - 群管理
  - 积分排行
  - 活跃排行（新增）
  - 分群排行
  - 模板编辑
  - 接口文档
- **分群排行优化**：卡片式群选择器，更美观易用
- **积分排行页面**：独立的积分排行页面，显示 TOP100
- **活跃排行页面**：独立的活跃排行页面，显示 TOP100

#### 4. 统计数据增强
- 新增总活跃天数统计
- 优化统计卡片展示

### 改进

#### 1. 全服排行逻辑优化
- 全服排行现在基于累计签到天数更准确
- 每天首次签到计为1天活跃，跨群不重复计算

#### 2. API 接口文档更新
- 新增活跃排行接口文档
- 新增积分管理接口文档
- 完善接口说明和示例代码

#### 3. 数据结构扩展
- `UserCheckinData` 新增 `activeDays` 和 `lastActiveDate` 字段
- `GroupUserCheckinData` 新增 `pointsHistory` 字段，用于记录积分变更历史

### 技术细节

#### 新增类型定义
```typescript
// 积分变更记录
interface PointsChangeRecord {
  timestamp: number;
  date: string;
  time: string;
  points: number;        // 变更积分（正数增加，负数减少）
  balance: number;       // 变更后余额
  type: 'signin' | 'admin' | 'exchange' | 'other';
  description: string;
  operatorId?: string;
}
```

#### 新增 API 端点
- `GET /checkin/active-ranking` - 活跃排行
- `GET /checkin/groups/:groupId/users/:userId/points` - 查询积分
- `POST /checkin/groups/:groupId/users/:userId/points` - 修改积分
- `GET /checkin/groups/:groupId/users/:userId/points/history` - 积分历史
- `POST /checkin/groups/:groupId/users/:userId/points/reset` - 重置积分

### 使用建议

#### 积分兑换系统集成
1. 调用查询接口确认用户当前积分
2. 调用修改接口扣减积分（负值），type 设为 `exchange`
3. 在 description 中记录兑换详情，如 `"兑换奖励-精美头像框"`
4. 查询历史接口可用于用户查看兑换记录

### 命令列表更新
- `#cmd 活跃排行` - 查看全服活跃排行
- 现有命令保持不变

---

## [1.0.3] - 2026-02-10

### 修复
- 修复跨群签到积分问题
- 修复分群排行功能
- 修复 globalRank 未定义错误

### 改进
- 优化 API 接口
- 添加接口文档页面

---

## [1.0.2] - 2026-02-09

### 新增
- 分群签到功能
- 群内积分排行
- WebUI 管理界面

### 改进
- 优化签到卡片生成
- 支持自定义 HTML 模板

---

## [1.0.1] - 2026-02-08

### 新增
- 基础签到功能
- 积分系统
- 连续签到加成
- 周末加成

---

## [1.0.0] - 2026-02-07

### 初始版本
- 基础框架搭建
- 插件初始化