import { useState, useEffect } from 'react'
import { getActiveRanking, getCheckinStats } from '../utils/api'
import { showToast } from '../hooks/useToast'
import UserDetailModal from '../components/UserDetailModal'
import type { ActiveRankingItem, CheckinStats } from '../types'

export default function ActiveRankingPage() {
    const [ranking, setRanking] = useState<ActiveRankingItem[]>([])
    const [stats, setStats] = useState<CheckinStats | null>(null)
    const [loading, setLoading] = useState(false)
    const [selectedUser, setSelectedUser] = useState<{ userId: string; nickname: string } | null>(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            // 获取统计数据
            const statsRes = await getCheckinStats()
            if (statsRes.code === 0 && statsRes.data) {
                setStats(statsRes.data)
            }

            // 获取活跃排行
            const rankingRes = await getActiveRanking()
            if (rankingRes.code === 0 && rankingRes.data) {
                setRanking(rankingRes.data.ranking)
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

    return (
        <div className="space-y-6">
            {/* 统计概览卡片 */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-[#1a1b1d] rounded-xl p-5 border border-gray-200 dark:border-gray-800">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">总用户数</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</div>
                    </div>
                    <div className="bg-white dark:bg-[#1a1b1d] rounded-xl p-5 border border-gray-200 dark:border-gray-800">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">总签到次数</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCheckins}</div>
                    </div>
                    <div className="bg-white dark:bg-[#1a1b1d] rounded-xl p-5 border border-gray-200 dark:border-gray-800">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">今日签到</div>
                        <div className="text-2xl font-bold text-blue-500">{stats.todayCheckins}</div>
                    </div>
                    <div className="bg-white dark:bg-[#1a1b1d] rounded-xl p-5 border border-gray-200 dark:border-gray-800">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">活跃用户数</div>
                        <div className="text-2xl font-bold text-purple-500">{stats.activeUsers}</div>
                    </div>
                </div>
            )}

            {/* 刷新按钮 */}
            <div className="flex justify-end">
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                    {loading ? '刷新中...' : '刷新数据'}
                </button>
            </div>

            {/* 活跃排行表格 */}
            <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">全服活跃排行 TOP100</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        按使用天数排行，每天首次使用机器人计1天（识别最忠实的用户）
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">排名</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">用户</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">活跃天数</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">累计签到</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">总积分</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">最后活跃</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {ranking.map((user, index) => (
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
                                        <div 
                                            className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => setSelectedUser({ userId: user.userId, nickname: user.nickname })}
                                        >
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
                                        <span className="text-sm font-bold text-green-600 dark:text-green-400">{user.activeDays} 天</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {user.totalCheckinDays} 天
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {(user.totalExp || user.totalPoints || 0).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {user.lastActiveDate}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {ranking.length === 0 && (
                        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                            暂无数据
                        </div>
                    )}
                </div>
            </div>

            {/* 用户详情弹窗 */}
            {selectedUser && (
                <UserDetailModal
                    userId={selectedUser.userId}
                    nickname={selectedUser.nickname}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </div>
    )
}