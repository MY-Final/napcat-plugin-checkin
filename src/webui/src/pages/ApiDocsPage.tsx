import { useState } from 'react';
import { IconBook, IconTerminal, IconBook as IconBookSvg } from '../components/icons';
import { ApiCard } from '../components/ApiCard';
import { API_ENDPOINTS } from '../data/apiEndpoints';
import { TEMPLATE_VARIABLES, LEADERBOARD_TEMPLATE_VARIABLES } from '../data/templateVariables';
import {
    sections,
    sectionNames,
    getSectionEndpoints,
    isSectionId,
} from '../utils/apiDocsHelper';

export default function ApiDocsPage() {
    const [activeSection, setActiveSection] = useState('quickstart');
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    const getEndpointsForNav = (sectionId: string) => {
        return getSectionEndpoints(sectionId, API_ENDPOINTS);
    };

    return (
        <div className="min-h-screen grid grid-cols-[260px_1fr] gap-6">
            <aside className="w-64 sticky top-0 h-screen overflow-y-auto bg-white dark:bg-[#1a1b1d] border-r border-gray-200 dark:border-gray-800">
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
                        {sections.map(section => (
                            <div key={section.key}>
                                <button
                                    onClick={() => {
                                        if (section.id === 'quickstart') {
                                            setActiveSection('quickstart');
                                            setExpandedSection(null);
                                        } else {
                                            setExpandedSection(expandedSection === section.id ? null : section.id);
                                        }
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                        activeSection === section.id
                                            ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <section.icon size={16} />
                                    {section.key}
                                    {section.id !== 'quickstart' && (
                                        <svg
                                            className={`w-4 h-4 ml-auto transition-transform ${expandedSection === section.id ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    )}
                                </button>

                                {section.id !== 'quickstart' && expandedSection === section.id && (
                                    <div className="ml-3 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                                        {getEndpointsForNav(section.id).map(endpoint => (
                                            <button
                                                key={endpoint.id}
                                                onClick={() => setActiveSection(endpoint.id)}
                                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                                                    activeSection === endpoint.id
                                                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400'
                                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                }`}
                                            >
                                                <span className={`px-1.5 py-0.5 rounded ${
                                                    endpoint.method === 'GET'
                                                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                        : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                                                }`}>
                                                    {endpoint.method}
                                                </span>
                                                <span className="truncate flex-1">{endpoint.title}</span>
                                                {endpoint.authRequired && (
                                                    <svg className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                    </svg>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </nav>
                </div>
            </aside>

            <main className="overflow-y-auto bg-gray-50 dark:bg-[#0f0f10] p-6">
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
                                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    需要认证的接口
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    部分接口（如修改积分、配置管理等）需要通过 NapCat WebUI 认证后才能调用。
                                </p>

                                <div className="mb-6">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">获取 Token</h4>
                                    <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                        <li>打开 NapCat WebUI 管理页面</li>
                                        <li>登录管理员账号</li>
                                        <li>打开浏览器开发者工具（F12）</li>
                                        <li>切换到 Application → Cookies</li>
                                        <li>找到 <code className="text-brand-600 dark:text-brand-400">access_token</code> 或 <code className="text-brand-600 dark:text-brand-400">session</code> 对应的值</li>
                                    </ol>
                                </div>

                                <div className="mb-6">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Postman 调用示例</h4>
                                    <div className="bg-gray-100 dark:bg-[#0f0f10] p-3 rounded-lg font-mono text-sm text-gray-700 dark:text-gray-300 mb-2">
                                        <span className="text-orange-500 font-medium">POST</span> /api/Plugin/ext/napcat-plugin-checkin/config
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Headers:</p>
                                    <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto mb-2">
                                        {`Authorization: Bearer <你的token>
Content-Type: application/json`}
                                    </pre>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Body:</p>
                                    <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
                                        {`{
  "enabled": true,
  "checkinCommands": "签到,打卡"
}`}
                                    </pre>
                                </div>

                                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-medium text-orange-700 dark:text-orange-400">提示</span>
                                    </div>
                                    <p className="text-sm text-orange-600 dark:text-orange-300">
                                        标记为 <span className="px-1.5 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded text-xs">需鉴权</span> 的接口都需要在请求头中携带 token。
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <IconTerminal className="text-brand-500" size={20} />
                                    调用示例
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">在其他插件中调用（无需认证）</p>
                                <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto mb-6">
                                    <code>{`// 获取全服排行榜
const response = await fetch('http://localhost:6099/plugin/napcat-plugin-checkin/api/checkin/ranking');
const result = await response.json();

// 查询签到日志
const logsRes = await fetch('http://localhost:60999/plugin/napcat-plugin-checkin/api/logs?page=1&pageSize=50&status=success');
const logsData = await logsRes.json();

// 奖励积分（v1 API）
const awardRes = await fetch('http://localhost:6099/plugin/napcat-plugin-checkin/api/v1/groups/123/users/456/award', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    description: '每日签到奖励',
    source: 'signin'
  })
});

// 预览模板
const previewRes = await fetch('http://localhost:6099/plugin/napcat-plugin-checkin/api/template/preview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template: '<div>{{nickname}}</div>',
    data: { nickname: 'Final' }
  })
});`}</code>
                                </pre>

                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">使用 curl 调用（需要认证的接口）</p>
                                <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                                    <code>{`# 修改用户积分（需要 token）
curl -X POST http://localhost:6099/api/Plugin/ext/napcat-plugin-checkin/checkin/groups/123/users/456/points \\
  -H "Authorization: Bearer <你的token>" \\
  -H "Content-Type: application/json" \\
  -d '{"points": -100, "description": "兑换奖励", "type": "exchange"}'

# 保存配置（需要 token）
curl -X POST http://localhost:6099/api/Plugin/ext/napcat-plugin-checkin/config \\
  -H "Authorization: Bearer <你的token>" \\
  -H "Content-Type: application/json" \\
  -d '{"enabled": true}'`}</code>
                                </pre>
                            </div>

                            <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">签到模板变量</h3>
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

                            <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">排行榜模板变量</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {LEADERBOARD_TEMPLATE_VARIABLES.map((variable) => (
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
                    ) : isSectionId(activeSection) ? (
                        <>
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                    <IconBookSvg className="text-brand-500" size={24} />
                                    {sectionNames[activeSection]}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">接口列表</p>
                            </div>
                            {getEndpointsForNav(activeSection).map((endpoint) => (
                                <ApiCard key={endpoint.id} endpoint={endpoint} />
                            ))}
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
                                            {endpoint.authRequired && (
                                                <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-medium">
                                                    需鉴权
                                                </span>
                                            )}
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
    );
}
