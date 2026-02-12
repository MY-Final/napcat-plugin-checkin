import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconSearch, IconCheck, IconAlert, IconChart, IconUsers } from '../components/icons'
import { noAuthFetch } from '../utils/api'

interface CheckinLog {
    id: string
    userId: string
    nickname: string
    groupId: string
    groupName: string
    timestamp: number
    date: string
    time: string
    earnedPoints: number
    consecutiveDays: number
    totalPoints: number
    totalDays: number
    basePoints: number
    consecutiveBonus: number
    weekendBonus: number
    weekday: number
    weekdayName: string
    isWeekend: boolean
    quote: string
    replyMode: 'text' | 'image' | 'auto'
    status: 'success' | 'failed'
    errorMessage?: string
}

interface LogStats {
    totalCheckins: number
    totalPoints: number
    totalUsers: number
    totalGroups: number
    dailyAverage: number
    totalLogs: number
    dailyStats: { date: string; checkinCount: number; totalPoints: number; userCount: number }[]
    topUsers: { userId: string; nickname: string; checkinCount: number; totalPoints: number; lastCheckinTime: number }[]
    topGroups: { groupId: string; groupName: string; checkinCount: number; userCount: number; totalPoints: number }[]
}

interface DailyTrend {
    date: string
    count: number
    points: number
}



function getAvatarUrl(userId: string): string {
    return `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=100`
}

function getGroupAvatarUrl(groupId: string): string {
    return `https://p.qlogo.cn/gh/${groupId}/${groupId}/100`
}

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
    return (
        <div className="bg-white dark:bg-[#1a1b1d] rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4`}>
                {icon}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        </div>
    )
}

function LogDetailModal({ log, onClose }: { log: CheckinLog; onClose: () => void }) {
    const modalContent = (
        <div className="fixed inset-0 z-[9999]">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-white dark:bg-[#1a1b1d] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden pointer-events-auto" onClick={e => e.stopPropagation()}>
                    <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-6 relative">
                        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-all">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                        <div className="flex items-center gap-4">
                            <img src={getAvatarUrl(log.userId)} alt="" className="w-14 h-14 rounded-full border-4 border-white/40 shadow-lg" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(log.nickname)}&size=100&background=FB7299&color=fff` }} />
                            <div className="text-white flex-1 min-w-0">
                                <h3 className="text-lg font-bold truncate">{log.nickname}</h3>
                                <p className="text-white/70 text-sm">QQ: {log.userId}</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            <img src={getGroupAvatarUrl(log.groupId)} alt="" className="w-10 h-10 rounded" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(log.groupName)}&size=100&background=FB7299&color=fff` }} />
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white truncate">{log.groupName}</p>
                                <p className="text-xs text-gray-500">群号: {log.groupId}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                                <div className="text-lg font-bold text-green-500">+{log.earnedPoints}</div>
                                <div className="text-xs text-gray-500">获得积分</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                                <div className="text-lg font-bold text-blue-500">{log.totalPoints}</div>
                                <div className="text-xs text-gray-500">累计积分</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                                <div className="text-lg font-bold text-purple-500">{log.consecutiveDays}天</div>
                                <div className="text-xs text-gray-500">连续签到</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                                <div className="text-xs text-gray-500 mb-1">签到信息</div>
                                <div className="text-sm text-gray-900 dark:text-white">{log.date} {log.weekdayName}</div>
                                <div className="text-sm text-gray-900 dark:text-white">{log.time}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                                <div className="text-xs text-gray-500 mb-1">统计</div>
                                <div className="text-sm text-gray-900 dark:text-white">累计{log.totalDays}天</div>
                                <div className="text-sm text-gray-900 dark:text-white">模式: {log.replyMode}</div>
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-500">基础积分</span>
                                <span className="text-gray-900 dark:text-white">{log.basePoints}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-500">连续加成</span>
                                <span className="text-orange-500">+{log.consecutiveBonus}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">周末加成</span>
                                <span className="text-pink-500">+{log.weekendBonus}</span>
                            </div>
                        </div>
                        {log.quote && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                                <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">励志短句</div>
                                <div className="text-sm text-yellow-800 dark:text-yellow-200">{log.quote}</div>
                            </div>
                        )}
                        {log.status === 'failed' && log.errorMessage && (
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                                <div className="text-xs text-red-600 dark:text-red-400 mb-1">错误信息</div>
                                <div className="text-sm text-red-800 dark:text-red-200">{log.errorMessage}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
    return createPortal(modalContent, document.body)
}

function SimpleChart({ data, title }: { data: DailyTrend[]; title: string }) {
    const maxCount = Math.max(...data.map(d => d.count), 1)
    const maxPoints = Math.max(...data.map(d => d.points), 1)

    return (
        <div className="bg-white dark:bg-[#1a1b1d] rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
            <div className="h-40 flex items-end gap-1">
                {data.slice(-14).map((item, index) => (
                    <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col gap-0.5">
                            <div className="w-full bg-brand-200 dark:bg-brand-800 rounded-t" style={{ height: `${(item.count / maxCount) * 80}px` }} title={`签到: ${item.count}`} />
                            <div className="w-full bg-green-400 dark:bg-green-600 rounded-b" style={{ height: `${(item.points / maxPoints) * 40}px` }} title={`积分: ${item.points}`} />
                        </div>
                        {index % 2 === 0 && <span className="text-[10px] text-gray-400 transform -rotate-45 origin-center">{item.date.slice(5)}</span>}
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-brand-300" /><span className="text-gray-500">签到次数</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-400" /><span className="text-gray-500">获得积分</span></div>
            </div>
        </div>
    )
}

export default function LogsPage() {
    const [logs, setLogs] = useState<CheckinLog[]>([])
    const [stats, setStats] = useState<LogStats | null>(null)
    const [trend, setTrend] = useState<DailyTrend[]>([])
    const [loading, setLoading] = useState(true)
    const [statsLoading, setStatsLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [selectedLog, setSelectedLog] = useState<CheckinLog | null>(null)

    const [filters, setFilters] = useState({
        userId: '',
        userNickname: '',
        groupId: '',
        groupName: '',
        startDate: '',
        endDate: '',
        status: 'all' as 'all' | 'success' | 'failed',
    })

    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all')

    useEffect(() => {
        fetchLogs()
    }, [page, filters])

    useEffect(() => {
        fetchStats()
        fetchTrend()
    }, [timeRange])

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(page), pageSize: '20' })
            if (filters.userId) params.append('userId', filters.userId)
            if (filters.userNickname) params.append('userNickname', filters.userNickname)
            if (filters.groupId) params.append('groupId', filters.groupId)
            if (filters.groupName) params.append('groupName', filters.groupName)
            if (filters.startDate) params.append('startDate', filters.startDate)
            if (filters.endDate) params.append('endDate', filters.endDate)
            if (filters.status !== 'all') params.append('status', filters.status)

            const data = await noAuthFetch<{logs: CheckinLog[], totalPages: number}>(`/logs?${params}`)
            if (data.code === 0 && data.data) {
                setLogs(data.data.logs)
                setTotalPages(data.data.totalPages)
            }
        } catch (err) {
            console.error('获取日志失败:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchStats = async () => {
        setStatsLoading(true)
        try {
            const data = await noAuthFetch<LogStats>(`/logs/stats?timeRange=${timeRange}`)
            if (data.code === 0 && data.data) {
                setStats(data.data)
            }
        } catch (err) {
            console.error('获取统计失败:', err)
        } finally {
            setStatsLoading(false)
        }
    }

    const fetchTrend = async () => {
        try {
            const days = timeRange === 'today' ? 7 : timeRange === 'week' ? 14 : timeRange === 'month' ? 30 : 90
            const data = await noAuthFetch<DailyTrend[]>(`/logs/trend?days=${days}`)
            if (data.code === 0 && data.data) {
                setTrend(data.data)
            }
        } catch (err) {
            console.error('获取趋势失败:', err)
        }
    }

    const handleSearch = () => {
        setPage(1)
        fetchLogs()
    }

    const handleClearFilters = () => {
        setFilters({ userId: '', userNickname: '', groupId: '', groupName: '', startDate: '', endDate: '', status: 'all' })
        setPage(1)
        fetchLogs()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch()
    }

    return (
        <div className="space-y-6">
            {selectedLog && <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="总签到次数" value={statsLoading ? '-' : (stats?.totalCheckins || 0)} icon={<IconCheck size={24} className="text-green-600" />} color="bg-green-100 dark:bg-green-900/30" />
                <StatCard title="总获得积分" value={statsLoading ? '-' : (stats?.totalPoints || 0)} icon={<IconChart size={24} className="text-blue-600" />} color="bg-blue-100 dark:bg-blue-900/30" />
                <StatCard title="参与用户" value={statsLoading ? '-' : (stats?.totalUsers || 0)} icon={<IconUsers size={24} className="text-purple-600" />} color="bg-purple-100 dark:bg-purple-900/30" />
                <StatCard title="参与群组" value={statsLoading ? '-' : (stats?.totalGroups || 0)} icon={<IconChart size={24} className="text-orange-600" />} color="bg-orange-100 dark:bg-orange-900/30" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SimpleChart data={trend} title="签到趋势" />
                {statsLoading ? (
                    <div className="bg-white dark:bg-[#1a1b1d] rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                        <div className="animate-pulse space-y-4">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>)}
                        </div>
                    </div>
                ) : stats && stats.topUsers.length > 0 ? (
                    <div className="bg-white dark:bg-[#1a1b1d] rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">签到TOP10用户</h3>
                        <div className="space-y-2">
                            {stats.topUsers.slice(0, 5).map((user, index) => (
                                <div key={user.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-100 text-gray-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 dark:bg-gray-800 text-gray-500'}`}>{index + 1}</span>
                                    <img src={getAvatarUrl(user.userId)} alt="" className="w-8 h-8 rounded-full" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nickname)}&size=100&background=FB7299&color=fff` }} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">{user.nickname}</p>
                                        <p className="text-xs text-gray-500">{user.checkinCount} 次签到</p>
                                    </div>
                                    <span className="text-sm font-medium text-green-600">{user.totalPoints} 积分</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-[#1a1b1d] rounded-xl p-6 border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-500">暂无签到数据</div>
                )}
            </div>

            <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex flex-wrap items-center gap-4 mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white">签到记录</h3>
                    <div className="flex items-center gap-2 ml-auto">
                        {(['all', 'today', 'week', 'month', 'year'] as const).map((range) => (
                            <button key={range} onClick={() => { setTimeRange(range); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${timeRange === range ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                {range === 'all' ? '全部' : range === 'today' ? '今天' : range === 'week' ? '本周' : range === 'month' ? '本月' : '今年'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-[#0f0f10] rounded-xl">
                    <div className="flex-1 min-w-[140px]"><input type="text" placeholder="用户QQ" value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })} onKeyDown={handleKeyDown} className="w-full px-3 py-2 bg-white dark:bg-[#1a1b1d] border border-gray-200 dark:border-gray-700 rounded-lg text-sm" /></div>
                    <div className="flex-1 min-w-[140px]"><input type="text" placeholder="用户昵称" value={filters.userNickname} onChange={(e) => setFilters({ ...filters, userNickname: e.target.value })} onKeyDown={handleKeyDown} className="w-full px-3 py-2 bg-white dark:bg-[#1a1b1d] border border-gray-200 dark:border-gray-700 rounded-lg text-sm" /></div>
                    <div className="flex-1 min-w-[140px]"><input type="text" placeholder="群号" value={filters.groupId} onChange={(e) => setFilters({ ...filters, groupId: e.target.value })} onKeyDown={handleKeyDown} className="w-full px-3 py-2 bg-white dark:bg-[#1a1b1d] border border-gray-200 dark:border-gray-700 rounded-lg text-sm" /></div>
                    <div className="flex-1 min-w-[140px]"><input type="text" placeholder="群名称" value={filters.groupName} onChange={(e) => setFilters({ ...filters, groupName: e.target.value })} onKeyDown={handleKeyDown} className="w-full px-3 py-2 bg-white dark:bg-[#1a1b1d] border border-gray-200 dark:border-gray-700 rounded-lg text-sm" /></div>
                    <div className="flex items-center gap-2">
                        <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="px-3 py-2 bg-white dark:bg-[#1a1b1d] border border-gray-200 dark:border-gray-700 rounded-lg text-sm" />
                        <span className="text-gray-400">至</span>
                        <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="px-3 py-2 bg-white dark:bg-[#1a1b1d] border border-gray-200 dark:border-gray-700 rounded-lg text-sm" />
                    </div>
                    <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value as 'all' | 'success' | 'failed' })} className="px-3 py-2 bg-white dark:bg-[#1a1b1d] border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
                        <option value="all">全部状态</option>
                        <option value="success">成功</option>
                        <option value="failed">失败</option>
                    </select>
                    <button onClick={handleSearch} className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"><IconSearch size={16} />搜索</button>
                    <button onClick={handleClearFilters} className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm">清空</button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" /></div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-12 text-gray-500"><p>暂无签到记录</p></div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-800">
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">群聊</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">获得积分</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">连续天数</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="px-4 py-3 whitespace-nowrap"><div className="text-sm text-gray-900 dark:text-white">{log.date}</div><div className="text-xs text-gray-500">{log.time}</div></td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <img src={getAvatarUrl(log.userId)} alt="" className="w-8 h-8 rounded-full" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(log.nickname)}&size=100&background=FB7299&color=fff` }} />
                                                    <div><div className="text-sm font-medium text-gray-900 dark:text-white">{log.nickname}</div><div className="text-xs text-gray-500">{log.userId}</div></div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <img src={getGroupAvatarUrl(log.groupId)} alt="" className="w-8 h-8 rounded" />
                                                    <div><div className="text-sm text-gray-900 dark:text-white">{log.groupName}</div><div className="text-xs text-gray-500">{log.groupId}</div></div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3"><span className="text-sm font-medium text-green-600">+{log.earnedPoints}</span></td>
                                            <td className="px-4 py-3"><span className={`text-sm ${log.consecutiveDays >= 7 ? 'text-orange-500' : 'text-gray-500'}`}>{log.consecutiveDays} 天</span></td>
                                            <td className="px-4 py-3">
                                                {log.status === 'success' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs"><IconCheck size={12} />成功</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs"><IconAlert size={12} />失败</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button onClick={() => setSelectedLog(log)} className="text-brand-600 hover:text-brand-700 dark:text-brand-400 text-sm font-medium">详情</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6">
                                <button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-50">上一页</button>
                                <span className="px-3 py-1.5 text-sm text-gray-500">第 {page} / {totalPages} 页</span>
                                <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-50">下一页</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
