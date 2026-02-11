import { useState, useEffect } from 'react'
import { getRanking, getGroupsStats, getCheckinStats } from '../utils/api'
import { showToast } from '../hooks/useToast'
import type { UserRanking, GroupCheckinStats, CheckinStats } from '../types'

type ViewMode = 'global' | 'group'

export default function CheckinDataPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('global')
    const [globalRanking, setGlobalRanking] = useState<UserRanking[]>([])
    const [groupsStats, setGroupsStats] = useState<GroupCheckinStats[]>([])
    const [stats, setStats] = useState<CheckinStats | null>(null)
    const [selectedGroup, setSelectedGroup] = useState<string>('')
    const [loading, setLoading] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            // 获取统计数据
            const statsRes = await getCheckinStats()
            if (statsRes.code === 0 && statsRes.data) {
                setStats(statsRes.data)
            }

            // 获取全服排行
            const rankingRes = await getRanking()
            if (rankingRes.code === 0 && rankingRes.data) {
                setGlobalRanking(rankingRes.data.ranking)
            }

            // 获取所有群统计
            const groupsRes = await getGroupsStats()
            if (groupsRes.code === 0 && groupsRes.data) {
                setGroupsStats(groupsRes.data)
                // 如果没有选中群，默认选中第一个
                if (groupsRes.data.length > 0 && !selectedGroup) {
                    setSelectedGroup(groupsRes.data[0].groupId)
                }
            }
        } catch (error) {
            showToast('获取数据失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    // 获取当前选中的群数据
    const selectedGroupData = groupsStats.find(g => g.groupId === selectedGroup)

    return (
        <div className="space-y-6">
            {/* 统计概览卡片 */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white dark:bg-[#1a1b1d] rounded-xl p-5 border border-gray-200 dark:border-gray-800">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">总用户数</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</div>
                    </div>
                    <div className="bg-white dark:bg-[#1a1b1d] rounded-xl p-5 border border-gray-200 dark:border-gray-800">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">总签到次数</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCheckins}</div>
                    </div>
                    <div className="bg-white dark:bg-[#1a1b1d] rounded-xl p-5 border border-gray-200 dark:border-gray-800">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">总积分</div>
                        <div className="text-2xl font-bold text-brand-500">{stats.totalPoints.toLocaleString()}</div>
                    </div>
                    <div className="bg-white dark:bg-[#1a1b1d] rounded-xl p-5 border border-gray-200 dark:border-gray-800">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">今日签到</div>
                        <div className="text-2xl font-bold text-green-500">{stats.todayCheckins}</div>
                    </div>
                    <div className="bg-white dark:bg-[#1a1b1d] rounded-xl p-5 border border-gray-200 dark:border-gray-800">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">活跃用户</div>
                        <div className="text-2xl font-bold text-blue-500">{stats.activeUsers}</div>
                    </div>
                </div>
            )}

            {/* 切换按钮和刷新 */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-white dark:bg-[#1a1b1d] p-1 rounded-lg border border-gray-200 dark:border-gray-800">
                    <button
                        onClick={() => setViewMode('global')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            viewMode === 'global'
                                ? 'bg-brand-500 text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        全服排行
                    </button>
                    <button
                        onClick={() => setViewMode('group')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            viewMode === 'group'
                                ? 'bg-brand-500 text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        分群排行
                    </button>
                </div>

                {viewMode === 'group' && groupsStats.length > 0 && (
                    <select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1b1d] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                    >
                        {groupsStats.map(group => (
                            <option key={group.groupId} value={group.groupId}>
                                {group.groupName || group.groupId} ({group.totalCheckins}人签到)
                            </option>
                        ))}
                    </select>
                )}

                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                    {loading ? '刷新中...' : '刷新数据'}
                </button>
            </div>

            {/* 全服排行 */}
            {viewMode === 'global' && (
                <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">全服积分排行 TOP50</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">排名</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">用户</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">总积分</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">签到天数</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">连续签到</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">最后签到</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {globalRanking.map((user, index) => (
                                    <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {index < 3 ? (
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold ${
                                                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                                                }`}>
                                                    {index + 1}
                                                </span>
                                            ) : (
                                                <span className="text-gray-500 dark:text-gray-400 font-medium ml-2">{index + 1}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <img
                                                    className="w-8 h-8 rounded-full mr-3 object-cover"
                                                    src={`http://q.qlogo.cn/headimg_dl?dst_uin=${user.userId}&spec=100&img_type=jpg`}
                                                    alt={user.nickname}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nickname)}&size=100&background=FB7299&color=fff`;
                                                    }}
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{user.nickname}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{user.userId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-brand-500">{user.totalPoints.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {user.totalCheckinDays} 天
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                                user.consecutiveDays >= 7 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                user.consecutiveDays >= 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            }`}>
                                                {user.consecutiveDays} 天
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {user.lastCheckinDate}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {globalRanking.length === 0 && (
                            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                                暂无数据
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 分群排行 */}
            {viewMode === 'group' && selectedGroupData && (
                <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {selectedGroupData.groupName || selectedGroupData.groupId} 签到排行
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                群内共 {selectedGroupData.totalCheckins} 人签到，总积分 {selectedGroupData.totalPoints.toLocaleString()}，今日 {selectedGroupData.todayCheckins} 人签到
                            </p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">排名</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">用户</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">群内积分</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">签到次数</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">最后签到</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {selectedGroupData.users.map((user, index) => (
                                    <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {index < 3 ? (
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold ${
                                                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                                                }`}>
                                                    {index + 1}
                                                </span>
                                            ) : (
                                                <span className="text-gray-500 dark:text-gray-400 font-medium ml-2">{index + 1}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <img
                                                    className="w-8 h-8 rounded-full mr-3 object-cover"
                                                    src={`http://q.qlogo.cn/headimg_dl?dst_uin=${user.userId}&spec=100&img_type=jpg`}
                                                    alt={user.nickname}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nickname)}&size=100&background=FB7299&color=fff`;
                                                    }}
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{user.nickname}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{user.userId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-brand-500">{user.groupPoints.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {user.groupCheckinDays} 次
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {user.lastCheckinDate}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {selectedGroupData.users.length === 0 && (
                            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                                该群暂无签到数据
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 无数据提示 */}
            {viewMode === 'group' && groupsStats.length === 0 && (
                <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无群签到数据</h3>
                    <p className="text-gray-500 dark:text-gray-400">还没有用户在群内签到，快去群聊中使用签到功能吧！</p>
                </div>
            )}
        </div>
    )
}
