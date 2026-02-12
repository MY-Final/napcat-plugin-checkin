import { IconCheck, IconLightbulb, IconCode, IconUsers, IconSparkles, IconAlertCircle } from '../components/icons'

interface FeatureCardProps {
    icon: React.ReactNode
    title: string
    description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
    return (
        <div className="bg-white dark:bg-[#1a1b1d] rounded-xl p-6 border border-gray-200 dark:border-gray-800 hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-4">
                {icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
    )
}

interface CommandItemProps {
    command: string
    description: string
    example?: string
}

function CommandItem({ command, description, example }: CommandItemProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <code className="flex-shrink-0 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-brand-600 dark:text-brand-400 rounded-lg text-sm font-medium">
                {command}
            </code>
            <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300">{description}</p>
                {example && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{example}</p>
                )}
            </div>
        </div>
    )
}

export default function HelpPage() {
    return (
        <div className="space-y-8">
            {/* 欢迎区域 */}
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-8 text-white">
                <div className="flex items-center gap-3 mb-4">
                    <IconSparkles size={28} />
                    <h1 className="text-2xl font-bold">欢迎使用签到插件</h1>
                </div>
                <p className="text-brand-100 text-lg leading-relaxed max-w-3xl mb-6">
                    这是一个功能强大的 NapCat 签到插件，支持精美签到卡片、积分系统、多群独立统计，
                    并且提供了丰富的 API 接口供其他插件扩展使用。
                </p>
                <a
                    href="http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=myZ-6WbZkavmF1KWGNdTQ8SpbVAi_hjY&authKey=qytWUv7F5XBh18%2FbyLreigwR3QzfSh9nKPu3anwOdcoOqPyzZOavROvPNGdLmq8V&noverify=0&group_code=1072957415"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.97 1.25-5.57 3.67-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.05-.49-.83-.27-1.49-.42-1.43-.88.03-.25.35-.51.96-.78 3.76-1.64 6.27-2.72 7.53-3.26 3.58-1.49 4.33-1.75 4.81-1.76.11 0 .35.03.51.16.13.11.17.26.18.38-.01.08-.01.19-.02.33z"/>
                    </svg>
                    加入QQ群（1072957415）
                </a>
            </div>

            {/* 核心功能 */}
            <section>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <IconCheck className="text-green-500" size={24} />
                    核心功能
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FeatureCard
                        icon={<IconCheck size={24} />}
                        title="精美签到卡片"
                        description="使用 HTML + Canvas 生成精美的签到卡片，支持自定义模板，让签到更有仪式感"
                    />
                    <FeatureCard
                        icon={<IconUsers size={24} />}
                        title="多群独立统计"
                        description="每个群有独立的积分和签到统计，互不干扰，适合多个群同时使用"
                    />
                    <FeatureCard
                        icon={<IconLightbulb size={24} />}
                        title="积分加成系统"
                        description="支持连续签到加成、周末加成、特殊日期加成，激励用户每日打卡"
                    />
                    <FeatureCard
                        icon={<IconTrophy size={24} />}
                        title="双榜排名"
                        description="积分排行（按积分）和活跃排行（按使用天数），满足不同场景的排名需求"
                    />
                    <FeatureCard
                        icon={<IconCode size={24} />}
                        title="API 接口"
                        description="提供完整的 RESTful API，支持查询、修改积分，方便其他插件集成"
                    />
                    <FeatureCard
                        icon={<IconAlertCircle size={24} />}
                        title="权限管理"
                        description="支持群管理命令，群主/管理员可以开启/关闭群内签到功能"
                    />
                </div>
            </section>

            {/* 快速开始 */}
            <section>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <IconLightbulb className="text-yellow-500" size={24} />
                    快速开始
                </h2>
                <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                    <div className="space-y-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">1. 基础使用</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            在群聊中发送 <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-brand-600 dark:text-brand-400">签到</code> 或配置的签到命令即可打卡。
                            首次使用插件会自动创建用户数据。
                        </p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">2. 查看排行</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            发送 <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-brand-600 dark:text-brand-400">#cmd 积分排行</code> 查看群内排行，
                            <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-brand-600 dark:text-brand-400">#cmd 活跃排行</code> 查看全服活跃排行。
                        </p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">3. 管理功能</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            群主/管理员可以发送 <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-brand-600 dark:text-brand-400">#cmd 关闭签到</code> 或
                            <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-brand-600 dark:text-brand-400">#cmd 开启签到</code> 控制群内签到功能。
                        </p>
                    </div>
                </div>
            </section>

            {/* 命令列表 */}
            <section>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <IconCode className="text-blue-500" size={24} />
                    命令列表
                </h2>
                
                {/* 基础命令 */}
                <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        基础签到命令
                    </h3>
                    <div className="space-y-1">
                        <CommandItem
                            command="签到"
                            description="每日签到，获取随机积分（10-50分）"
                            example="支持自定义命令词：签到、打卡、sign、checkin"
                        />
                        <CommandItem
                            command="#cmd 我的积分"
                            description="查询个人积分、签到天数、连续签到等详细数据"
                        />
                        <CommandItem
                            command="#cmd help"
                            description="查看插件帮助信息和所有可用命令"
                        />
                    </div>
                </div>

                {/* 排行榜命令 */}
                <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        排行榜命令
                    </h3>
                    <div className="space-y-1">
                        <CommandItem
                            command="#cmd 周榜"
                            description="查看本周群内积分排行榜"
                            example="显示本周积分TOP用户，附带个人排名"
                        />
                        <CommandItem
                            command="#cmd 月榜"
                            description="查看本月群内积分排行榜"
                            example="显示本月积分TOP用户，附带个人排名"
                        />
                        <CommandItem
                            command="#cmd 年榜"
                            description="查看本年度群内积分排行榜"
                            example="显示年度积分TOP用户，附带个人排名"
                        />
                        <CommandItem
                            command="#cmd 总榜"
                            description="查看群内总积分排行榜"
                            example="显示历史总积分TOP用户，附带个人排名"
                        />
                        <CommandItem
                            command="排行榜 / 排行 / rank"
                            description="快捷查看排行榜（可在配置中自定义命令词）"
                            example="默认显示周榜，支持在插件配置中修改"
                        />
                        <CommandItem
                            command="#cmd 积分排行"
                            description="查看全服积分排行TOP100"
                            example="跨群统计，显示所有用户的积分排名"
                        />
                        <CommandItem
                            command="#cmd 活跃排行"
                            description="查看全服活跃排行TOP100"
                            example="按使用天数排序，识别最忠实的用户"
                        />
                    </div>
                </div>

                {/* 管理命令 */}
                <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        群管理命令（仅群主/管理员）
                    </h3>
                    <div className="space-y-1">
                        <CommandItem
                            command="#cmd 开启签到"
                            description="开启本群签到功能"
                            example="开启后群成员可以使用签到命令"
                        />
                        <CommandItem
                            command="#cmd 关闭签到"
                            description="关闭本群签到功能"
                            example="关闭后群成员无法使用签到命令"
                        />
                    </div>
                </div>
            </section>

            {/* WebUI 功能说明 */}
            <section>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <IconCheck className="text-purple-500" size={24} />
                    WebUI 功能介绍
                </h2>
                <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                    <div className="space-y-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">📊 仪表盘</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            查看插件运行状态、今日处理消息数、累计处理消息数、插件运行时长等统计信息。
                        </p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">⚙️ 插件配置</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            可视化配置所有参数：基础设置、签到功能、签到时间、积分规则、连续签到加成、周末加成、排行榜设置等。
                        </p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">👥 群管理</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            查看所有群的群头像、群名称、群号、成员数，管理各群的签到功能开关，支持批量启用/禁用。
                        </p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">📈 排行榜查看</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            积分榜、活跃榜、分群排行。点击用户头像可查看详细信息：累计积分、签到天数、连续签到、最近签到记录等。
                        </p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">🎨 模板编辑</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            可视化编辑签到卡片和排行榜卡片的 HTML 模板，支持实时预览。提供丰富的模板变量，支持自定义样式。
                        </p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">📚 接口文档</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            查看完整的 API 接口文档，包含请求/响应格式和示例代码，方便其他插件集成。
                        </p>
                    </div>
                </div>
            </section>

            {/* 配置项说明 */}
            <section>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <IconLightbulb className="text-orange-500" size={24} />
                    主要配置项说明
                </h2>
                <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 dark:bg-[#0f0f10] rounded-lg">
                            <div className="font-medium text-gray-900 dark:text-white text-sm">签到回复模式</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                自动：优先使用图片卡片，失败时降级为文字<br/>
                                图片：强制使用图片卡片（需安装 Puppeteer 插件）<br/>
                                文字：只发送文字回复
                            </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-[#0f0f10] rounded-lg">
                            <div className="font-medium text-gray-900 dark:text-white text-sm">签到时间设置</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                可自定义每日刷新时间（默认0点）<br/>
                                支持每日/每周/每月不同周期<br/>
                                可设置每个周期内可签到次数
                            </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-[#0f0f10] rounded-lg">
                            <div className="font-medium text-gray-900 dark:text-white text-sm">连续签到加成</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                每天额外 +N 积分（默认+2）<br/>
                                可设置加成上限（默认上限+20）<br/>
                                激励用户坚持每日打卡
                            </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-[#0f0f10] rounded-lg">
                            <div className="font-medium text-gray-900 dark:text-white text-sm">排行榜回复模式</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                支持文字/图片/自动三种模式<br/>
                                图片模式展示精美的排行榜卡片<br/>
                                可自定义排行榜命令关键词
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 扩展开发 */}
            <section>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <IconCode className="text-purple-500" size={24} />
                    扩展开发指南
                </h2>
                <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">积分兑换系统</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            插件提供了完整的积分管理 API，你可以开发兑换功能，让用户用群内积分兑换奖励。
                        </p>
                        <div className="bg-gray-50 dark:bg-[#0f0f10] rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">示例代码：</h4>
                            <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                                <code>{`// 查询用户积分
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
});`}</code>
                            </pre>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">自定义模板</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            插件支持自定义签到卡片和排行榜卡片的 HTML 模板：
                        </p>
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">签到模板变量：</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                                    {['{{nickname}}', '{{userId}}', '{{totalPoints}}', '{{totalDays}}', 
                                      '{{todayRank}}', '{{checkinTime}}', '{{currentDate}}', '{{quote}}'].map((variable) => (
                                        <code key={variable} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-brand-600 dark:text-brand-400 rounded text-xs text-center">
                                            {variable}
                                        </code>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">排行榜模板特殊变量：</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                                    {['{{typeName}}', '{{groupId}}', '{{usersHtml}}', '{{myRankHtml}}', '{{maxPoints}}'].map((variable) => (
                                        <code key={variable} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-brand-600 dark:text-brand-400 rounded text-xs text-center">
                                            {variable}
                                        </code>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                    {'{{usersHtml}}'} 和 {'{{myRankHtml}}'} 会自动生成用户列表和个人状态栏的 HTML
                                </p>
                            </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                <strong>依赖说明：</strong>如需使用图片打卡功能，需要安装 
                                <a href="https://github.com/AQiaoYo/napcat-plugin-puppeteer" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">
                                    napcat-plugin-puppeteer
                                </a> 插件。
                                本插件的模板编辑功能仿照 Puppeteer 渲染服务设计。
                            </p>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">API 文档</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            详细 API 文档请查看"接口文档"页面，包含所有接口的请求/响应格式和示例代码。
                        </p>
                    </div>
                </div>
            </section>

            {/* 注意事项 */}
            <section>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <IconAlertCircle className="text-red-500" size={24} />
                    注意事项
                </h2>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                    <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
                        <li className="flex items-start gap-2">
                            <span className="mt-1">•</span>
                            <span>积分数据保存在插件数据目录，请定期备份重要数据</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="mt-1">•</span>
                            <span>修改用户积分时请确保积分充足，否则操作会失败</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="mt-1">•</span>
                            <span>重置积分操作不可逆，请谨慎使用</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="mt-1">•</span>
                            <span>建议为积分兑换功能添加确认机制，避免误操作</span>
                        </li>
                    </ul>
                </div>
            </section>

            {/* 反馈与支持 */}
            <section>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">反馈与支持</h2>
                <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        如果你在使用过程中遇到问题，或有功能建议，欢迎通过以下方式反馈：
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <a
                            href="http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=myZ-6WbZkavmF1KWGNdTQ8SpbVAi_hjY&authKey=qytWUv7F5XBh18%2FbyLreigwR3QzfSh9nKPu3anwOdcoOqPyzZOavROvPNGdLmq8V&noverify=0&group_code=1072957415"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#12B7F5] hover:bg-[#0ea5e0] text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.97 1.25-5.57 3.67-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.05-.49-.83-.27-1.49-.42-1.43-.88.03-.25.35-.51.96-.78 3.76-1.64 6.27-2.72 7.53-3.26 3.58-1.49 4.33-1.75 4.81-1.76.11 0 .35.03.51.16.13.11.17.26.18.38-.01.08-.01.19-.02.33z"/>
                            </svg>
                            QQ群（1072957415）
                        </a>
                        <a
                            href="https://github.com/MY-Final/napcat-plugin-checkin"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015-2.895-.015-3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            GitHub 仓库
                        </a>
                    </div>
                </div>
            </section>
        </div>
    )
}

// 辅助图标组件
function IconTrophy({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    )
}