import { useState } from 'react'
import { IconBook, IconTerminal } from '../components/icons'

interface ApiEndpoint {
  id: string
  method: 'GET' | 'POST'
  path: string
  title: string
  description: string
  params?: ApiParam[]
  response?: string
  example?: string
}

interface ApiParam {
  name: string
  type: string
  required: boolean
  description: string
}

const API_ENDPOINTS: ApiEndpoint[] = [
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
}`
  },
  {
    id: 'groups',
    method: 'GET',
    path: '/groups',
    title: '获取群列表',
    description: '获取所有群及其配置信息',
    response: `{
  "code": 0,
  "data": [
    {
      "group_id": 123456,
      "group_name": "测试群",
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
    description: '更新指定群的配置',
    params: [
      { name: 'enabled', type: 'boolean', required: false, description: '是否启用此群' },
      { name: 'enableCheckin', type: 'boolean', required: false, description: '是否启用群内签到' },
    ],
    example: `{
  "enableCheckin": true
}`
  },
  {
    id: 'global-ranking',
    method: 'GET',
    path: '/checkin/ranking',
    title: '全服积分排行',
    description: '获取全服积分排行榜 TOP100',
    response: `{
  "code": 0,
  "data": {
    "totalUsers": 150,
    "ranking": [
      {
        "userId": "1150880493",
        "nickname": "Final",
        "totalPoints": 1000,
        "totalCheckinDays": 50
      }
    ]
  }
}`
  },
  {
    id: 'group-ranking',
    method: 'GET',
    path: '/checkin/groups/:id/ranking',
    title: '群内积分排行',
    description: '获取指定群的积分排行',
    response: `{
  "code": 0,
  "data": {
    "groupId": "123456",
    "totalUsers": 50,
    "ranking": [
      {
        "userId": "1150880493",
        "nickname": "Final",
        "totalPoints": 500
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
    description: '获取签到统计数据',
    response: `{
  "code": 0,
  "data": {
    "totalUsers": 150,
    "totalCheckins": 5000,
    "totalPoints": 25000,
    "todayCheckins": 30,
    "activeUsers": 80
  }
}`
  },
  {
    id: 'user-data',
    method: 'GET',
    path: '/checkin/user/:id',
    title: '用户签到数据',
    description: '获取指定用户的签到详情',
    response: `{
  "code": 0,
  "data": {
    "userId": "1150880493",
    "nickname": "Final",
    "totalPoints": 1000,
    "totalCheckinDays": 50,
    "checkinHistory": [...]
  }
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
    "totalCheckins": 50,
    "totalPoints": 2500,
    "todayCheckins": 10
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
    "totalPoints": 500,
    "totalCheckinDays": 20
  }
}`
  },
  {
    id: 'update-user-points',
    method: 'POST',
    path: '/checkin/groups/:groupId/users/:userId/points',
    title: '修改用户积分',
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
    id: 'template-preview',
    method: 'POST',
    path: '/template/preview',
    title: '预览模板',
    description: '预览自定义HTML模板渲染效果',
    params: [
      { name: 'template', type: 'string', required: true, description: 'HTML模板字符串' },
      { name: 'data', type: 'object', required: false, description: '模板变量数据' },
    ],
    response: `{
  "code": 0,
  "data": {
    "image": "data:image/png;base64,...",
    "time": 150
  }
}`,
    example: `{
  "template": "<html>...{{nickname}}...</html>",
  "data": {
    "nickname": "Final",
    "earnedPoints": 21
  }
}`
  },
]

const TEMPLATE_VARIABLES = [
  { name: '{{nickname}}', description: '用户昵称' },
  { name: '{{userId}}', description: '用户QQ号' },
  { name: '{{avatarUrl}}', description: '头像URL' },
  { name: '{{earnedPoints}}', description: '本次获得积分' },
  { name: '{{totalPoints}}', description: '累计积分' },
  { name: '{{totalDays}}', description: '累计签到天数' },
  { name: '{{todayRank}}', description: '今日排名' },
  { name: '{{checkinTime}}', description: '签到时间' },
  { name: '{{currentDate}}', description: '当前日期' },
  { name: '{{quote}}', description: '随机寄语' },
  { name: '{{consecutiveDays}}', description: '连续签到天数' },
  { name: '{{weekday}}', description: '星期几（0-6数字）' },
  { name: '{{weekdayName}}', description: '星期几（中文：周一...周日）' },
  { name: '{{isWeekend}}', description: '是否周末（true/false）' },
  { name: '{{groupName}}', description: '群名称（群内签到时显示）' },
  { name: '{{activeDays}}', description: '活跃天数（使用次数）' },
  { name: '{{basePoints}}', description: '本次基础积分（不含加成）' },
  { name: '{{consecutiveBonus}}', description: '连续签到加成' },
  { name: '{{weekendBonus}}', description: '周末加成' },
]

function ApiCard({ endpoint }: { endpoint: ApiEndpoint }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between bg-white dark:bg-[#1a1b1d] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            endpoint.method === 'GET' 
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
              : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
          }`}>
            {endpoint.method}
          </span>
          <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{endpoint.path}</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{endpoint.title}</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-[#0f0f10] border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{endpoint.description}</p>

          {endpoint.params && endpoint.params.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-3">
                Request Body (JSON)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white dark:bg-[#1a1b1d]">
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">参数名</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">类型</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">必填</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">说明</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-[#1a1b1d]">
                    {endpoint.params.map((param) => (
                      <tr key={param.name} className="border-b border-gray-200 dark:border-gray-800 last:border-0">
                        <td className="px-4 py-2 font-mono text-brand-600 dark:text-brand-400">{param.name}</td>
                        <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{param.type}</td>
                        <td className="px-4 py-2">
                          {param.required ? (
                            <span className="text-red-500 font-medium">YES</span>
                          ) : (
                            <span className="text-gray-400">NO</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{param.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {endpoint.example && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">
                请求示例
              </h4>
              <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
                <code>{endpoint.example}</code>
              </pre>
            </div>
          )}

          {endpoint.response && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">
                Response JSON
              </h4>
              <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
                <code>{endpoint.response}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState('quickstart')

  return (
    <div className="h-[calc(100vh-140px)] flex">
      {/* 左侧导航 */}
      <aside className="w-64 flex-shrink-0 bg-white dark:bg-[#1a1b1d] border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white">
              <IconBook size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">签到插件</h2>
              <p className="text-xs text-gray-400">API 文档</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveSection('quickstart')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === 'quickstart'
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <IconTerminal size={16} />
              快速开始
            </button>

            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">核心接口</p>
            </div>

            {API_ENDPOINTS.slice(0, 3).map((endpoint) => (
              <button
                key={endpoint.id}
                onClick={() => setActiveSection(endpoint.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === endpoint.id
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className={`text-xs ${
                  endpoint.method === 'GET' ? 'text-blue-500' : 'text-orange-500'
                }`}>
                  {endpoint.method}
                </span>
                <span className="truncate">{endpoint.path}</span>
              </button>
            ))}

            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">签到数据</p>
            </div>

            {API_ENDPOINTS.slice(3, 11).map((endpoint) => (
              <button
                key={endpoint.id}
                onClick={() => setActiveSection(endpoint.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === endpoint.id
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className={`text-xs ${
                  endpoint.method === 'GET' ? 'text-blue-500' : 'text-orange-500'
                }`}>
                  {endpoint.method}
                </span>
                <span className="truncate">{endpoint.path}</span>
              </button>
            ))}

            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">积分管理</p>
            </div>

            {API_ENDPOINTS.slice(11, 15).map((endpoint) => (
              <button
                key={endpoint.id}
                onClick={() => setActiveSection(endpoint.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === endpoint.id
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className={`text-xs ${
                  endpoint.method === 'GET' ? 'text-blue-500' : 'text-orange-500'
                }`}>
                  {endpoint.method}
                </span>
                <span className="truncate">{endpoint.path}</span>
              </button>
            ))}

            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">模板服务</p>
            </div>

            {API_ENDPOINTS.slice(15).map((endpoint) => (
              <button
                key={endpoint.id}
                onClick={() => setActiveSection(endpoint.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === endpoint.id
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className={`text-xs ${
                  endpoint.method === 'GET' ? 'text-blue-500' : 'text-orange-500'
                }`}>
                  {endpoint.method}
                </span>
                <span className="truncate">{endpoint.path}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* 右侧内容 */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0f0f10]">
        <div className="max-w-4xl mx-auto p-8">
          {activeSection === 'quickstart' ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <IconTerminal className="text-brand-500" size={24} />
                  快速开始
                </h2>
                <p className="text-gray-600 dark:text-gray-400">开发者调用参考</p>
              </div>

              <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">API 路径说明</h3>
                
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium rounded">RECOMMENDED</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">无认证 API（供其他插件调用）</span>
                  </div>
                  <div className="bg-gray-100 dark:bg-[#0f0f10] p-3 rounded-lg font-mono text-sm text-gray-700 dark:text-gray-300">
                    {'{host}'}/plugin/napcat-plugin-checkin/api/{'{endpoint}'}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-medium rounded">WEBUI</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">WebUI 管理</span>
                  </div>
                  <div className="bg-gray-100 dark:bg-[#0f0f10] p-3 rounded-lg font-mono text-sm text-gray-700 dark:text-gray-300">
                    {'{host}'}/api/Plugin/ext/napcat-plugin-checkin/{'{endpoint}'}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <IconTerminal className="text-brand-500" size={20} />
                  调用示例
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">在其他插件中调用（无需认证）</p>
                <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{`// 获取全服排行榜
const response = await fetch('http://localhost:6099/plugin/napcat-plugin-checkin/api/checkin/ranking');
const result = await response.json();
// result.data.ranking 为排行榜数组

// 预览模板
const response = await fetch('http://localhost:6099/plugin/napcat-plugin-checkin/api/template/preview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template: '<div>{{nickname}}</div>',
    data: { nickname: 'Final' }
  })
});
const result = await response.json();
// result.data.image 为 Base64 图片数据`}</code>
                </pre>
              </div>

              <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">模板变量</h3>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATE_VARIABLES.map((variable) => (
                    <div key={variable.name} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-[#0f0f10] rounded">
                      <code className="text-brand-600 dark:text-brand-400 font-mono text-sm bg-brand-50 dark:bg-brand-900/20 px-1.5 py-0.5 rounded">
                        {variable.name}
                      </code>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{variable.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {API_ENDPOINTS.filter(e => e.id === activeSection).map((endpoint) => (
                <div key={endpoint.id}>
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded text-sm font-medium ${
                        endpoint.method === 'GET' 
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                          : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        {endpoint.method}
                      </span>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{endpoint.title}</h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">{endpoint.description}</p>
                  </div>

                  <ApiCard endpoint={endpoint} />
                </div>
              ))}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
